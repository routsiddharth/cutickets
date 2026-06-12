"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin, isSuperAdmin, SUPERADMIN_EMAILS } from "@/lib/admin";
import { notify } from "@/lib/notifications";
import { runMatch, releaseReservation } from "@/lib/matching";
import { isAllowedEmail } from "@/lib/domains";
import type { ActionState } from "./types";

export type { ActionState };

// ─── Admin invite management (superadmin only) ─────────────────────────────

export async function inviteAdmin(email: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

  const normalized = email.trim().toLowerCase();
  if (!isAllowedEmail(normalized)) {
    return { error: "Must be a columbia.edu or barnard.edu address" };
  }
  if ((SUPERADMIN_EMAILS as readonly string[]).includes(normalized)) {
    return { error: "Already a superadmin" };
  }

  const target = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, role: true, email: true },
  });

  if (target) {
    if (target.role === "ADMIN" || isSuperAdmin(target)) {
      return { error: "Already an admin" };
    }
    await prisma.user.update({ where: { id: target.id }, data: { role: "ADMIN" } });
    await notify({
      userId: target.id,
      type: "ADMIN_ROLE_GRANTED",
      body: "You've been granted admin access on CUTickets",
    });
    revalidatePath("/admin/users");
    return { ok: true };
  }

  // User not yet registered — queue the invite
  await prisma.adminInvite.upsert({
    where: { email: normalized },
    update: { createdBy: user.id },
    create: { email: normalized, createdBy: user.id },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function cancelAdminInvite(id: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

  await prisma.adminInvite.delete({ where: { id } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function revokeAdmin(targetUserId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { error: "User not found" };
  if (isSuperAdmin(target)) return { error: "Cannot revoke a superadmin" };
  if (target.role !== "ADMIN") return { error: "User is not an admin" };

  await prisma.user.update({ where: { id: targetUserId }, data: { role: "USER" } });
  revalidatePath("/admin/users");
  return { ok: true };
}

// ─── Moderation (admin + superadmin) ──────────────────────────────────────

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
      userId: true,
      eventId: true,
      status: true,
      event: { select: { name: true } },
    },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.status !== "OPEN") return { error: "Listing is not open" };

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "CANCELLED", remainingQuantity: 0 },
  });

  const body = reason
    ? `Your listing for "${listing.event.name}" was removed by a moderator: ${reason}`
    : `Your listing for "${listing.event.name}" was removed by a moderator`;

  await notify({ userId: listing.userId, type: "LISTING_KILLED", body });

  revalidatePath(`/events/${listing.eventId}`);
  revalidatePath("/admin/moderation");
  return { ok: true };
}

export async function adminCancelTrade(
  matchId: string,
  reason?: string,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

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
  if (match.status !== "RESERVED" && match.status !== "ACCEPTED") {
    return { error: "Match is not active" };
  }

  const body = reason
    ? `Your trade for "${match.event.name}" was cancelled by a moderator: ${reason}`
    : `Your trade for "${match.event.name}" was cancelled by a moderator`;

  await runMatch(match.eventId, async (tx) => {
    const fresh = await tx.match.findUnique({
      where: { id: match.id },
      select: { status: true },
    });
    if (!fresh || (fresh.status !== "RESERVED" && fresh.status !== "ACCEPTED")) return;
    await releaseReservation(tx, match, "CANCELLED");
    await notify({ userId: match.buyerId, type: "TRADE_ADMIN_CANCELLED", body, matchId: match.id }, tx);
    await notify({ userId: match.sellerId, type: "TRADE_ADMIN_CANCELLED", body, matchId: match.id }, tx);
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/matches");
  return { ok: true };
}

// ─── Ad management (superadmin only) ──────────────────────────────────────

const adSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  imageUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  linkUrl: z.string().trim().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  body: z.string().trim().max(1000).optional(),
  placement: z.enum(["EVENTS_LIST", "EVENT_PAGE"], { message: "Pick a placement" }),
});

export async function createAd(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

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
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

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
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

  await prisma.ad.delete({ where: { id: adId } });

  revalidatePath("/admin/ads");
  revalidatePath("/events");
  return { ok: true };
}

export async function toggleAd(adId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isSuperAdmin(user)) return { error: "Not authorized" };

  const ad = await prisma.ad.findUnique({ where: { id: adId }, select: { active: true } });
  if (!ad) return { error: "Ad not found" };

  await prisma.ad.update({ where: { id: adId }, data: { active: !ad.active } });

  revalidatePath("/admin/ads");
  revalidatePath("/events");
  return { ok: true };
}
