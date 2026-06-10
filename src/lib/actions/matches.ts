"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { isListingAvailable } from "@/lib/listing";

import type { ActionState } from "./types";
export type { ActionState };

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
    select: { id: true, ownerId: true, status: true },
  });
  if (!match) return { error: "Match not found" };
  if (match.ownerId !== user.id) return { error: "Not authorized" };
  if (match.status !== "PENDING") return { error: "Already responded" };

  await prisma.match.update({
    where: { id: match.id },
    data: { status: parsed.data.decision === "ACCEPT" ? "ACCEPTED" : "DECLINED" },
  });
  revalidatePath("/matches");
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
      listing: { select: { priceCents: true, eventId: true } },
    },
  });
  if (!match) return { error: "Match not found" };

  const isOwner = match.ownerId === user.id;
  const isInterested = match.interestedId === user.id;
  if (!isOwner && !isInterested) return { error: "Not authorized" };

  // Read-and-write inside one transaction so two simultaneous confirms (one
  // from each party) can't each read the other's flag as false and lose the
  // completion. We deliberately do NOT mutate the listing here: a match is an
  // agreement between two people, independent of the listing's lifecycle. This
  // avoids overwriting a CANCELLED listing and avoids making a multi-ticket
  // listing vanish after a single buyer. The sale is recorded on the match
  // (agreedPriceCents) — that's what drives "last confirmed sale" & reputation.
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true, ownerConfirmed: true, interestedConfirmed: true },
    });
    if (!fresh || fresh.status !== "ACCEPTED") return;

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
  });

  revalidatePath("/matches");
  revalidatePath(`/events/${match.listing.eventId}`);
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
