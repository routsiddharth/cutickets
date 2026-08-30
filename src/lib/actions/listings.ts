"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { isNewAccount } from "@/lib/reputation";
import { notify } from "@/lib/notifications";
import {
  MAX_TICKETS_PER_LISTING,
  MAX_PRICE_CENTS,
  MAX_NOTES_LENGTH,
  NEW_ACCOUNT_ACTIVE_LISTING_CAP,
  ESTABLISHED_ACTIVE_LISTING_CAP,
  RESERVATION_WINDOW_MS,
} from "@/lib/constants";
import { dollarsToCents, firstName } from "@/lib/format";
import { availableListingWhere } from "@/lib/listing";
import type { ActionState } from "./types";

export type { ActionState };

const DEFAULT_EXPIRY_DAYS = 30;

const listingSchema = z.object({
  eventId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_TICKETS_PER_LISTING),
  price: z.string().trim().min(1, "Enter a price"),
  notes: z.string().trim().max(MAX_NOTES_LENGTH).optional(),
});

export async function createListing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");

  const parsed = listingSchema.safeParse({
    eventId: formData.get("eventId"),
    quantity: formData.get("quantity"),
    price: formData.get("price"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the listing" };

  const priceCents = dollarsToCents(parsed.data.price);
  if (priceCents === null || priceCents <= 0 || priceCents > MAX_PRICE_CENTS) {
    return { error: "Enter a valid price above $0" };
  }

  const [event, activeCount] = await Promise.all([
    prisma.event.findUnique({
      where: { id: parsed.data.eventId },
      select: { id: true, startsAt: true, archivedAt: true },
    }),
    prisma.listing.count({ where: { sellerId: user.id, ...availableListingWhere() } }),
  ]);
  if (!event) return { error: "That event no longer exists" };
  if (event.archivedAt) return { error: "This event is no longer accepting listings" };

  const cap = isNewAccount(user.createdAt)
    ? NEW_ACCOUNT_ACTIVE_LISTING_CAP
    : ESTABLISHED_ACTIVE_LISTING_CAP;
  if (activeCount >= cap) return { error: `You can have up to ${cap} active listings` };

  const expiresAt = event.startsAt
    ? new Date(event.startsAt.getTime() + 86_400_000)
    : new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 86_400_000);

  await prisma.listing.create({
    data: {
      eventId: event.id,
      sellerId: user.id,
      quantity: parsed.data.quantity,
      availableQuantity: parsed.data.quantity,
      priceCents,
      notes: parsed.data.notes ?? null,
      expiresAt,
    },
  });

  revalidatePath("/events");
  revalidatePath(`/events/${event.id}`);
  redirect(`/events/${event.id}`);
}

const reserveSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(MAX_TICKETS_PER_LISTING),
});

/** Atomically reserve fixed-price inventory and open a deal chat. */
export async function reserveListing(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const buyer = await requireUser();
  const parsed = reserveSchema.safeParse({
    listingId: formData.get("listingId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { error: "Choose a valid quantity" };

  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: {
        id: true,
        eventId: true,
        sellerId: true,
        priceCents: true,
        availableQuantity: true,
        status: true,
        expiresAt: true,
        event: { select: { name: true } },
      },
    });
    if (!listing) return { error: "This listing no longer exists" } as const;
    if (listing.sellerId === buyer.id) return { error: "You can’t reserve your own listing" } as const;
    if (
      listing.status !== "OPEN" ||
      listing.expiresAt <= new Date() ||
      listing.availableQuantity < parsed.data.quantity
    ) {
      return { error: "That quantity is no longer available. Refresh and try again." } as const;
    }

    const claimed = await tx.listing.updateMany({
      where: {
        id: listing.id,
        status: "OPEN",
        expiresAt: { gt: new Date() },
        availableQuantity: { gte: parsed.data.quantity },
      },
      data: { availableQuantity: { decrement: parsed.data.quantity } },
    });
    if (claimed.count === 0) {
      return { error: "Someone just reserved those tickets. Refresh to see what’s left." } as const;
    }

    const inventory = await tx.listing.findUnique({ where: { id: listing.id }, select: { availableQuantity: true } });
    if (inventory?.availableQuantity === 0) {
      await tx.listing.update({ where: { id: listing.id }, data: { status: "SOLD_OUT" } });
    }

    const deal = await tx.deal.create({
      data: {
        eventId: listing.eventId,
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        quantity: parsed.data.quantity,
        unitPriceCents: listing.priceCents,
        reservationExpiresAt: new Date(Date.now() + RESERVATION_WINDOW_MS),
      },
    });

    await tx.message.create({
      data: {
        dealId: deal.id,
        senderId: buyer.id,
        kind: "EVENT",
        body: `${firstName(buyer)} reserved ${parsed.data.quantity} ticket${parsed.data.quantity === 1 ? "" : "s"}.`,
      },
    });
    await notify(
      {
        userId: listing.sellerId,
        type: "DEAL_STARTED",
        dealId: deal.id,
        body: `${firstName(buyer)} reserved ${parsed.data.quantity} ticket${parsed.data.quantity === 1 ? "" : "s"} for ${listing.event.name}`,
      },
      tx,
    );
    return { dealId: deal.id, eventId: listing.eventId } as const;
  });

  if ("error" in result) return result;
  revalidatePath(`/events/${result.eventId}`);
  revalidatePath("/deals");
  redirect(`/deals/${result.dealId}`);
}

export async function cancelListing(listingId: string): Promise<ActionState> {
  const user = await requireUser();
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, eventId: true, status: true },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.sellerId !== user.id) return { error: "Not your listing" };
  if (listing.status !== "OPEN") return { error: "Listing is no longer available" };

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: "CANCELLED", availableQuantity: 0 },
  });
  revalidatePath(`/events/${listing.eventId}`);
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
