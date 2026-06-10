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

import type { ActionState } from "./types";
export type { ActionState };

const MAX_EXPIRY_DAYS = 60;

const schema = z.object({
  eventId: z.string().min(1, "Pick an event"),
  type: z.enum(LISTING_TYPES),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "At least 1 ticket")
    .max(MAX_TICKETS_PER_LISTING, `At most ${MAX_TICKETS_PER_LISTING} tickets`),
  price: z.string().trim().min(1, "Enter a price"),
  expiresInDays: z.coerce.number().int().min(1).max(MAX_EXPIRY_DAYS),
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
    expiresInDays: formData.get("expiresInDays"),
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
    select: { id: true },
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

  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000);

  await prisma.listing.create({
    data: {
      eventId: parsed.data.eventId,
      userId: user.id,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      priceCents,
      notes: parsed.data.notes ?? null,
      expiresAt,
    },
  });

  revalidatePath(`/events/${parsed.data.eventId}`);
  redirect(`/events/${parsed.data.eventId}`);
}

/** Cancel one of your own active listings. */
export async function cancelListing(listingId: string): Promise<ActionState> {
  const user = await requireUser();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, userId: true, eventId: true, status: true },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.userId !== user.id) return { error: "Not your listing" };
  if (listing.status !== "ACTIVE") return { error: "Listing is not active" };

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "CANCELLED" },
  });
  revalidatePath(`/events/${listing.eventId}`);
  revalidatePath(`/profile/${user.id}`);
  return undefined;
}
