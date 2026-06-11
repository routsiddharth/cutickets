"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notify } from "@/lib/notifications";
import { firstName } from "@/lib/format";
import { matchParty } from "@/lib/match";
import { runMatch, releaseReservation, markFilledIfDone } from "@/lib/matching";

import type { ActionState } from "./types";
export type { ActionState };

/**
 * Stage 1 — ACCEPT a reservation. Both the buyer and seller must accept before
 * the chat opens and identities are revealed. The auto-matched ticket is held
 * (reserved) until both accept, one declines, or the 24h window lapses.
 *
 * This only flips Match flags — it never reserves or frees book quantity — so it
 * deliberately runs in a plain transaction (not `runMatch`): the per-event lock
 * is unnecessary here, and the internal re-read guards against a double-accept.
 */
export async function acceptReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { error: "Missing match" };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, buyerId: true, sellerId: true, event: { select: { name: true } } },
  });
  if (!match) return { error: "Match not found" };
  const { isBuyer, isSeller, authorized, otherId } = matchParty(match, user.id);
  if (!authorized) return { error: "Not authorized" };
  const me = firstName(user);
  const eventName = match.event.name;

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true, buyerAccepted: true, sellerAccepted: true },
    });
    if (!fresh || fresh.status !== "RESERVED") return;

    const changed =
      (isBuyer && !fresh.buyerAccepted) || (isSeller && !fresh.sellerAccepted);
    if (!changed) return;

    const buyerAccepted = isBuyer ? true : fresh.buyerAccepted;
    const sellerAccepted = isSeller ? true : fresh.sellerAccepted;
    const both = buyerAccepted && sellerAccepted;

    await tx.match.update({
      where: { id: match.id },
      data: {
        buyerAccepted,
        sellerAccepted,
        ...(both ? { status: "ACCEPTED", acceptedAt: new Date() } : {}),
      },
    });

    if (both) {
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          kind: "EVENT",
          body: "You're connected — the chat is open. Say hi 👋",
        },
      });
      await notify(
        {
          userId: otherId,
          type: "OFFER_ACCEPTED",
          matchId: match.id,
          body: `Your match on ${eventName} is confirmed — open the chat`,
        },
        tx,
      );
    } else {
      await notify(
        {
          userId: otherId,
          type: "OFFER_ACCEPTED",
          matchId: match.id,
          body: `${me} confirmed your match on ${eventName} — confirm on your end to open the chat`,
        },
        tx,
      );
    }
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${match.id}`);
  return { ok: true };
}

/**
 * Decline a reservation (RESERVED) or back out of an accepted-but-not-completed
 * deal (ACCEPTED). Either party, either stage. The reserved tickets return to
 * the book and roll to the next person in the queue; this exact pairing won't be
 * re-matched.
 */
export async function declineReservation(
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
      eventId: true,
      buyOrderId: true,
      sellOrderId: true,
      buyerId: true,
      sellerId: true,
      reservedQuantity: true,
      status: true,
      event: { select: { name: true } },
    },
  });
  if (!match) return { error: "Match not found" };
  const { authorized, otherId } = matchParty(match, user.id);
  if (!authorized) return { error: "Not authorized" };
  if (match.status !== "RESERVED" && match.status !== "ACCEPTED") {
    return { error: "This match can no longer be cancelled" };
  }
  const me = firstName(user);

  await runMatch(match.eventId, async (tx) => {
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true },
    });
    if (!fresh || (fresh.status !== "RESERVED" && fresh.status !== "ACCEPTED")) return;

    // Backing out of an already-accepted deal is a CANCELLED, not a DECLINED —
    // and the counterparty gets different copy (they'd already connected).
    const accepted = fresh.status === "ACCEPTED";
    await releaseReservation(tx, match, accepted ? "CANCELLED" : "DECLINED");
    await notify(
      {
        userId: otherId,
        type: "MATCH_FOUND",
        matchId: match.id,
        body: accepted
          ? `${me} backed out of your ${match.event.name} deal — your order is back on the market`
          : `${me} passed on your ${match.event.name} match — we'll line up the next one`,
      },
      tx,
    );
  });

  revalidatePath("/matches");
  revalidatePath(`/matches/${match.id}`);
  return { ok: true };
}

/**
 * Stage 2 — CONFIRM the handoff actually happened. Two confirmations = the trade
 * is COMPLETED: we record the sale price and take the settled tickets off the
 * book for good. Runs under the per-event lock because completing a trade can
 * flip an order to FILLED — book state the matching engine also mutates.
 */
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
      eventId: true,
      buyOrderId: true,
      sellOrderId: true,
      buyerId: true,
      sellerId: true,
      settlePriceCents: true,
      event: { select: { name: true } },
    },
  });
  if (!match) return { error: "Match not found" };

  const { isBuyer, authorized, otherId } = matchParty(match, user.id);
  if (!authorized) return { error: "Not authorized" };
  const me = firstName(user);
  const eventName = match.event.name;

  // Read-and-write under the per-event lock so two simultaneous confirms (one per
  // party) can't each read the other's flag as false and lose the completion, and
  // so the FILLED flip can't race the matching engine on the same orders.
  await runMatch(match.eventId, async (tx) => {
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true, buyerConfirmed: true, sellerConfirmed: true },
    });
    if (!fresh || fresh.status !== "ACCEPTED") return;

    const changed =
      (isBuyer && !fresh.buyerConfirmed) || (!isBuyer && !fresh.sellerConfirmed);

    const buyerConfirmed = isBuyer ? true : fresh.buyerConfirmed;
    const sellerConfirmed = isBuyer ? fresh.sellerConfirmed : true;
    const both = buyerConfirmed && sellerConfirmed;

    await tx.match.update({
      where: { id: match.id },
      data: {
        buyerConfirmed,
        sellerConfirmed,
        ...(both
          ? {
              status: "COMPLETED",
              completedAt: new Date(),
              agreedPriceCents: match.settlePriceCents,
            }
          : {}),
      },
    });

    if (both) {
      // Settled tickets leave the book for good once nothing else is in flight.
      await markFilledIfDone(tx, match.buyOrderId);
      await markFilledIfDone(tx, match.sellOrderId);
    }

    if (!changed) return;

    if (both) {
      await tx.message.create({
        data: {
          matchId: match.id,
          senderId: user.id,
          kind: "EVENT",
          body: "Trade complete 🎉 — thanks for using CUTickets.",
        },
      });
      for (const uid of [match.buyerId, match.sellerId]) {
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
  revalidatePath(`/events/${match.eventId}`);
  return { ok: true };
}

const MAX_MESSAGE_LENGTH = 2000;

/** Send a chat message on a match's trade page. Both parties, once ACCEPTED. */
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
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });
  if (!match) return { error: "Match not found" };
  const { authorized, otherId } = matchParty(match, user.id);
  if (!authorized) return { error: "Not authorized" };
  // Chat opens on a confirmed match and stays open after completion (so the two
  // can still coordinate). It's closed for unaccepted / dead matches.
  if (match.status !== "ACCEPTED" && match.status !== "COMPLETED") {
    return { error: "Chat opens once you both confirm the match" };
  }

  await prisma.message.create({
    data: { matchId: match.id, senderId: user.id, body },
  });

  // Nudge the other party. Collapsed: one unread "new message" per chat, not one
  // per line.
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
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });
  if (!match) return { error: "Match not found" };
  if (match.status !== "COMPLETED") return { error: "Trade isn't completed yet" };

  const { authorized, otherId: subjectId } = matchParty(match, user.id);
  if (!authorized) return { error: "Not authorized" };

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

/**
 * Back out of a match (either party). Same effect as
 * declining: the tickets return to the book and roll to the next in queue.
 * Completed trades can't be cancelled.
 */
export async function cancelMatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return declineReservation(_prev, formData);
}
