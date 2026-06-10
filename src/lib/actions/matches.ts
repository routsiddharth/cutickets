"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { isListingAvailable } from "@/lib/listing";
import { notify } from "@/lib/notifications";

import type { ActionState } from "./types";
export type { ActionState };

/** A user's first name for chat events / notifications ("Jordan confirmed…"). */
function firstName(user: { name: string | null; email: string }): string {
  return (user.name ?? user.email.split("@")[0]).split(/\s+/)[0];
}

/** Click "I'm interested" / "I can sell" on a listing. Creates a PENDING match. */
export async function expressInterest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");

  const listingId = String(formData.get("listingId") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);
  if (!listingId) return { error: "Missing listing" };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, status: true, expiresAt: true, eventId: true },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.userId === user.id) return { error: "That's your own listing" };
  if (!isListingAvailable(listing)) {
    return { error: "This listing is no longer active" };
  }

  const existing = await prisma.match.findUnique({
    where: { listingId_interestedId: { listingId, interestedId: user.id } },
    select: { id: true },
  });
  if (existing) return { error: "You've already reached out on this listing" };

  await prisma.match.create({
    data: {
      listingId,
      interestedId: user.id,
      ownerId: listing.userId,
      message: message || null,
    },
  });

  revalidatePath(`/events/${listing.eventId}`);
  revalidatePath("/matches");
  return { ok: true };
}

const respondSchema = z.object({
  matchId: z.string().min(1),
  decision: z.enum(["ACCEPT", "DECLINE"]),
});

/** Listing owner accepts or declines an expression of interest. */
export async function respondToMatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = respondSchema.safeParse({
    matchId: formData.get("matchId"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { error: "Invalid request" };

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: {
      id: true,
      ownerId: true,
      interestedId: true,
      status: true,
      listing: { select: { event: { select: { name: true } } } },
    },
  });
  if (!match) return { error: "Match not found" };
  if (match.ownerId !== user.id) return { error: "Not authorized" };
  if (match.status !== "PENDING") return { error: "Already responded" };

  const accepted = parsed.data.decision === "ACCEPT";

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: { status: accepted ? "ACCEPTED" : "DECLINED" },
    });

    if (accepted) {
      // Open the chat with a system event, and tell the interested party.
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          kind: "EVENT",
          body: "Match accepted — the chat is open. Say hi 👋",
        },
      });
      await notify(
        {
          userId: match.interestedId,
          type: "OFFER_ACCEPTED",
          matchId: match.id,
          body: `Your offer on ${match.listing.event.name} was accepted — open the chat`,
        },
        tx,
      );
    }
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${match.id}`);
  return { ok: true };
}

/** Either party confirms the trade actually happened. Two confirmations = done. */
export async function confirmTrade(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { error: "Missing match" };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      ownerId: true,
      interestedId: true,
      listingId: true,
      listing: { select: { priceCents: true, eventId: true, event: { select: { name: true } } } },
    },
  });
  if (!match) return { error: "Match not found" };

  const isOwner = match.ownerId === user.id;
  const isInterested = match.interestedId === user.id;
  if (!isOwner && !isInterested) return { error: "Not authorized" };
  const otherId = isOwner ? match.interestedId : match.ownerId;
  const me = firstName(user);
  const eventName = match.listing.event.name;

  // Read-and-write inside one transaction so two simultaneous confirms (one
  // from each party) can't each read the other's flag as false and lose the
  // completion. When both sides confirm we mark the match COMPLETED *and* take
  // the listing down (status COMPLETED), so a settled ticket leaves the market.
  // The sale price is recorded on the match (agreedPriceCents) — that's what
  // drives "last confirmed sale" & reputation. Note: a multi-ticket listing is
  // taken down in full on its first completed trade; per-quantity decrement is
  // a future refinement.
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true, ownerConfirmed: true, interestedConfirmed: true },
    });
    if (!fresh || fresh.status !== "ACCEPTED") return;

    // Did *this* click actually flip a flag? Guards against a re-click emitting
    // duplicate events / notifications.
    const changed =
      (isOwner && !fresh.ownerConfirmed) || (isInterested && !fresh.interestedConfirmed);

    const ownerConfirmed = isOwner ? true : fresh.ownerConfirmed;
    const interestedConfirmed = isInterested ? true : fresh.interestedConfirmed;
    const bothConfirmed = ownerConfirmed && interestedConfirmed;

    await tx.match.update({
      where: { id: match.id },
      data: {
        ownerConfirmed,
        interestedConfirmed,
        ...(bothConfirmed
          ? {
              status: "COMPLETED",
              completedAt: new Date(),
              agreedPriceCents: match.listing.priceCents,
            }
          : {}),
      },
    });

    if (bothConfirmed) {
      // Take the listing off the market — but only if it's still ACTIVE, so we
      // never clobber a CANCELLED/already-COMPLETED listing.
      await tx.listing.updateMany({
        where: { id: match.listingId, status: "ACTIVE" },
        data: { status: "COMPLETED" },
      });
    }

    if (!changed) return;

    if (bothConfirmed) {
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          kind: "EVENT",
          body: "Trade complete — the listing has been taken down.",
        },
      });
      // Both sides get a "leave a rating" nudge.
      for (const uid of [match.ownerId, match.interestedId]) {
        await notify(
          {
            userId: uid,
            type: "TRADE_COMPLETED",
            matchId: match.id,
            body: `Your trade on ${eventName} is complete — leave a rating`,
          },
          tx,
        );
      }
    } else {
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          kind: "EVENT",
          body: `${me} confirmed the trade.`,
        },
      });
      await notify(
        {
          userId: otherId,
          type: "TRADE_CONFIRMED",
          matchId: match.id,
          body: `${me} confirmed the trade — confirm on your end to close it`,
        },
        tx,
      );
    }
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${match.id}`);
  revalidatePath(`/events/${match.listing.eventId}`);
  return { ok: true };
}

const MAX_MESSAGE_LENGTH = 2000;

/** Send a chat message on a match's deal desk. Both parties, once ACCEPTED. */
export async function sendMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!matchId) return { error: "Missing match" };
  if (!body) return { error: "Write a message first" };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, ownerId: true, interestedId: true, status: true },
  });
  if (!match) return { error: "Match not found" };
  if (match.ownerId !== user.id && match.interestedId !== user.id) {
    return { error: "Not authorized" };
  }
  // Chat opens on a confirmed match and stays open after completion (so the two
  // can still coordinate). It's closed for unaccepted / dead matches.
  if (match.status !== "ACCEPTED" && match.status !== "COMPLETED") {
    return { error: "Chat opens once your match is accepted" };
  }

  await prisma.message.create({
    data: { matchId: match.id, senderId: user.id, body },
  });

  // Nudge the other party. Collapsed: one unread "new message" per chat, not
  // one per line — and it resets the 4h idle timer for the nudge email.
  const otherId = match.ownerId === user.id ? match.interestedId : match.ownerId;
  await notify({
    userId: otherId,
    type: "NEW_MESSAGE",
    matchId: match.id,
    body: `New message from ${firstName(user)}`,
    collapse: true,
  });

  revalidatePath(`/matches/${match.id}`);
  return { ok: true };
}

const rateSchema = z.object({
  matchId: z.string().min(1),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional(),
});

/** Leave a 1–5 star rating on the counterparty after a completed trade. */
export async function rateTrade(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rateSchema.safeParse({
    matchId: formData.get("matchId"),
    stars: formData.get("stars"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { error: "Invalid rating" };

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { id: true, ownerId: true, interestedId: true, status: true },
  });
  if (!match) return { error: "Match not found" };
  if (match.status !== "COMPLETED") return { error: "Trade isn't completed yet" };

  const isOwner = match.ownerId === user.id;
  const isInterested = match.interestedId === user.id;
  if (!isOwner && !isInterested) return { error: "Not authorized" };
  const subjectId = isOwner ? match.interestedId : match.ownerId;

  await prisma.rating.upsert({
    where: { matchId_authorId: { matchId: match.id, authorId: user.id } },
    update: { stars: parsed.data.stars, comment: parsed.data.comment ?? null },
    create: {
      matchId: match.id,
      authorId: user.id,
      subjectId,
      stars: parsed.data.stars,
      comment: parsed.data.comment ?? null,
    },
  });

  revalidatePath("/matches");
  revalidatePath(`/profile/${subjectId}`);
  return { ok: true };
}

/** Withdraw / cancel a match (either party). */
export async function cancelMatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, ownerId: true, interestedId: true, status: true },
  });
  if (!match) return { error: "Match not found" };
  if (match.ownerId !== user.id && match.interestedId !== user.id) {
    return { error: "Not authorized" };
  }
  if (match.status === "COMPLETED") return { error: "Trade already completed" };

  await prisma.match.update({
    where: { id: match.id },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/matches");
  return { ok: true };
}
