"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { REPORT_REASONS } from "@/lib/constants";

import type { ActionState } from "./types";
export type { ActionState };

const schema = z.object({
  reportedId: z.string().min(1),
  listingId: z.string().optional(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

export async function reportUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    reportedId: formData.get("reportedId"),
    listingId: formData.get("listingId") || undefined,
    reason: formData.get("reason"),
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) return { error: "Please choose a reason" };

  if (parsed.data.reportedId === user.id) {
    return { error: "You can't report yourself" };
  }
  const reported = await prisma.user.findUnique({
    where: { id: parsed.data.reportedId },
    select: { id: true },
  });
  if (!reported) return { error: "User not found" };

  // If a listing is attached, it must actually belong to the reported user —
  // otherwise drop the reference so a report can't be tied to an unrelated one.
  let listingId: string | null = null;
  if (parsed.data.listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: { userId: true },
    });
    if (listing?.userId === parsed.data.reportedId) {
      listingId = parsed.data.listingId;
    }
  }

  // Collapse duplicate open reports from the same reporter about the same user.
  const dupe = await prisma.report.findFirst({
    where: {
      reporterId: user.id,
      reportedId: parsed.data.reportedId,
      resolved: false,
    },
    select: { id: true },
  });
  if (dupe) return { ok: true };

  await prisma.report.create({
    data: {
      reporterId: user.id,
      reportedId: parsed.data.reportedId,
      listingId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    },
  });

  revalidatePath(`/profile/${parsed.data.reportedId}`);
  return { ok: true };
}
