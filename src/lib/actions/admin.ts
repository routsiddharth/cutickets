"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { notify } from "@/lib/notifications";
import { releaseDeal } from "@/lib/deals";
import type { ActionState } from "./types";

export type { ActionState };

// ─── Moderation ───────────────────────────────────────────────────────────

export async function adminKillListing(
  listingId: string,
  reason?: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      eventId: true,
      status: true,
      event: { select: { name: true } },
    },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.status !== "OPEN") return { error: "Listing is not open" };

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "CANCELLED", availableQuantity: 0 },
  });

  const body = reason
    ? `Your listing for "${listing.event.name}" was removed by a moderator: ${reason}`
    : `Your listing for "${listing.event.name}" was removed by a moderator`;

  await notify({ userId: listing.sellerId, type: "LISTING_KILLED", body });

  revalidatePath(`/events/${listing.eventId}`);
  revalidatePath("/admin/moderation");
  return { ok: true };
}

export async function adminCancelDeal(
  dealId: string,
  reason?: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      eventId: true,
      listingId: true,
      buyerId: true,
      sellerId: true,
      quantity: true,
      status: true,
      event: { select: { name: true } },
    },
  });
  if (!deal) return { error: "Deal not found" };
  if (deal.status !== "RESERVED") {
    return { error: "Deal is not active" };
  }

  const body = reason
    ? `Your trade for "${deal.event.name}" was cancelled by a moderator: ${reason}`
    : `Your trade for "${deal.event.name}" was cancelled by a moderator`;

  await prisma.$transaction(async (tx) => {
    const released = await releaseDeal(tx, deal, "CANCELLED");
    if (!released) return;
    await notify({ userId: deal.buyerId, type: "TRADE_ADMIN_CANCELLED", body, dealId: deal.id }, tx);
    await notify({ userId: deal.sellerId, type: "TRADE_ADMIN_CANCELLED", body, dealId: deal.id }, tx);
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/deals");
  return { ok: true };
}

// ─── Ad management ────────────────────────────────────────────────────────

const adSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  imageUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  linkUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  body: z.string().trim().max(1000).optional(),
  placement: z.enum(["EVENTS_LIST", "EVENT_PAGE"], { message: "Pick a placement" }),
});

export async function createAd(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const parsed = adSchema.safeParse({
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
    body: formData.get("body") || undefined,
    placement: formData.get("placement"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.ad.create({
    data: {
      title: parsed.data.title,
      imageUrl: parsed.data.imageUrl || null,
      linkUrl: parsed.data.linkUrl || null,
      body: parsed.data.body || null,
      placement: parsed.data.placement,
    },
  });

  revalidatePath("/admin/ads");
  revalidatePath("/events");
  return { ok: true };
}

export async function updateAd(
  adId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const parsed = adSchema.safeParse({
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
    body: formData.get("body") || undefined,
    placement: formData.get("placement"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.ad.update({
    where: { id: adId },
    data: {
      title: parsed.data.title,
      imageUrl: parsed.data.imageUrl || null,
      linkUrl: parsed.data.linkUrl || null,
      body: parsed.data.body || null,
      placement: parsed.data.placement,
    },
  });

  revalidatePath("/admin/ads");
  revalidatePath("/events");
  return { ok: true };
}

export async function deleteAd(adId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  await prisma.ad.delete({ where: { id: adId } });

  revalidatePath("/admin/ads");
  revalidatePath("/events");
  return { ok: true };
}

export async function toggleAd(adId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const ad = await prisma.ad.findUnique({ where: { id: adId }, select: { active: true } });
  if (!ad) return { error: "Ad not found" };

  await prisma.ad.update({ where: { id: adId }, data: { active: !ad.active } });

  revalidatePath("/admin/ads");
  revalidatePath("/events");
  return { ok: true };
}
