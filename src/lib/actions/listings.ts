"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { isNewAccount } from "@/lib/reputation";
import {
  LISTING_TYPES,
  MAX_TICKETS_PER_LISTING,
  MAX_PRICE_CENTS,
  MAX_NOTES_LENGTH,
  NEW_ACCOUNT_ACTIVE_LISTING_CAP,
  ESTABLISHED_ACTIVE_LISTING_CAP,
} from "@/lib/constants";
import { dollarsToCents } from "@/lib/format";
import { availableListingWhere } from "@/lib/listing";
import { runMatch, matchOrder } from "@/lib/matching";

import type { ActionState } from "./types";
export type { ActionState };

// When an event has no set date, a listing can't track it — fall back to this.
const DEFAULT_EXPIRY_DAYS = 30;

const schema = z.object({
  eventId: z.string().min(1, "Pick an event"),
  type: z.enum(LISTING_TYPES),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "At least 1 ticket")
    .max(MAX_TICKETS_PER_LISTING, `At most ${MAX_TICKETS_PER_LISTING} tickets`),
  price: z.string().trim().min(1, "Enter a price"),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
});

export async function createListing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");

  const parsed = schema.safeParse({
    eventId: formData.get("eventId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    price: formData.get("price"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const priceCents = dollarsToCents(parsed.data.price);
  if (priceCents === null || priceCents > MAX_PRICE_CENTS) {
    return { error: "Enter a valid price" };
  }

  // The event must exist.
  const event = await prisma.event.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true, startsAt: true },
  });
  if (!event) return { error: "That event no longer exists" };

  // Rate-limit: cap active listings, with a tighter cap for brand-new accounts.
  const activeCount = await prisma.listing.count({
    where: { userId: user.id, ...availableListingWhere() },
  });
  const cap = isNewAccount(user.createdAt)
    ? NEW_ACCOUNT_ACTIVE_LISTING_CAP
    : ESTABLISHED_ACTIVE_LISTING_CAP;
  if (activeCount >= cap) {
    return {
      error: isNewAccount(user.createdAt)
        ? `New accounts can hold up to ${cap} active listings. Complete a trade or wait a few days to post more.`
        : `You already have ${cap} active listings. Close some before posting more.`,
    };
  }

  // A ticket is only good until the event happens, so the order expires the day
  // after the event — derived from the event, not chosen by the user. Events
  // with no set date fall back to a fixed window.
  const expiresAt = event.startsAt
    ? new Date(event.startsAt.getTime() + 86_400_000)
    : new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 86_400_000);

  // Create the order and immediately try to match it against the resting book —
  // both inside the per-event lock so the new order can't double-reserve tickets
  // a concurrent order is also claiming.
  const { matched } = await runMatch(parsed.data.eventId, async (tx) => {
    const order = await tx.listing.create({
      data: {
        eventId: parsed.data.eventId,
        userId: user.id,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        remainingQuantity: parsed.data.quantity,
        priceCents,
        notes: parsed.data.notes ?? null,
        expiresAt,
      },
    });
    const matches = await matchOrder(order.id, tx);
    return { matched: matches.length > 0 };
  });

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath("/matches");
  // Matched right away → send them to confirm it. Otherwise the order rests on
  // the book and we drop them back on the event with their live order showing.
  redirect(matched ? "/matches" : `/events/${parsed.data.eventId}`);
}

/** Cancel the live remainder of one of your own orders. Any tickets already
 * reserved in a pending match are unaffected — those reservations play out. */
export async function cancelListing(listingId: string): Promise<ActionState> {
  const user = await requireUser();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, eventId: true, status: true },
  });
  if (!listing) return { error: "Order not found" };
  if (listing.userId !== user.id) return { error: "Not your order" };
  if (listing.status !== "OPEN") return { error: "Order is no longer live" };

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "CANCELLED", remainingQuantity: 0 },
  });
  revalidatePath(`/events/${listing.eventId}`);
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
