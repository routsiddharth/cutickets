"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { convertFlyerImage, FlyerImageError, FLYER_CONTENT_TYPE, FLYER_MAX_UPLOAD_BYTES } from "@/lib/flyer";
import {
  computeFlyerTint,
  resolvePresetTint,
  isTintPresetKey,
  DEFAULT_TINT,
  type TintPresetKey,
} from "@/lib/flyerTint";
import type { ActionState } from "./types";

export async function uploadEventFlyer(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, tintOverride: true } });
  if (!event) return { error: "Event not found" };

  const file = formData.get("flyer");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload" };
  if (!file.type.startsWith("image/")) return { error: "That file isn't an image" };
  if (file.size > FLYER_MAX_UPLOAD_BYTES) return { error: "Image is too large (max 15MB)" };

  let converted: Uint8Array<ArrayBuffer>;
  try {
    const buffer = await convertFlyerImage(Buffer.from(await file.arrayBuffer()));
    converted = new Uint8Array(buffer.byteLength);
    converted.set(buffer);
  } catch (err) {
    if (err instanceof FlyerImageError) return { error: err.message };
    throw err;
  }

  // A host override wins over the poster: skip re-sampling so the chosen
  // org color survives a flyer swap.
  const tint = event.tintOverride ? null : await computeFlyerTint(Buffer.from(converted));

  await prisma.$transaction([
    prisma.eventFlyer.upsert({
      where: { eventId },
      create: { eventId, data: converted, contentType: FLYER_CONTENT_TYPE },
      update: { data: converted, contentType: FLYER_CONTENT_TYPE },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        flyerUpdatedAt: new Date(),
        ...(tint ? { tintTop: tint.tintTop, tintMid: tint.tintMid, tintAccent: tint.tintAccent } : {}),
      },
    }),
  ]);

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/edit`);
  return { ok: true };
}

export async function removeEventFlyer(eventId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { tintOverride: true } });
  if (!event) return { error: "Event not found" };

  await prisma.$transaction([
    prisma.eventFlyer.deleteMany({ where: { eventId } }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        flyerUpdatedAt: null,
        // No poster left to sample — fall back to plain cream, unless a host override is set.
        ...(event.tintOverride
          ? {}
          : { tintTop: DEFAULT_TINT.tintTop, tintMid: DEFAULT_TINT.tintMid, tintAccent: DEFAULT_TINT.tintAccent }),
      },
    }),
  ]);

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/edit`);
  return { ok: true };
}

/** Host override: pin the hero tint to a fixed org-color preset, or "AUTO" to derive it from the poster again. */
export async function setEventTintOverride(eventId: string, presetKey: TintPresetKey | "AUTO"): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };
  if (presetKey !== "AUTO" && !isTintPresetKey(presetKey)) return { error: "Unknown preset" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, flyerUpdatedAt: true } });
  if (!event) return { error: "Event not found" };

  if (presetKey === "AUTO") {
    let tint = DEFAULT_TINT;
    if (event.flyerUpdatedAt) {
      const flyer = await prisma.eventFlyer.findUnique({ where: { eventId }, select: { data: true } });
      if (flyer) tint = await computeFlyerTint(Buffer.from(flyer.data));
    }
    await prisma.event.update({
      where: { id: eventId },
      data: { tintOverride: null, tintTop: tint.tintTop, tintMid: tint.tintMid, tintAccent: tint.tintAccent },
    });
  } else {
    const tint = resolvePresetTint(presetKey);
    await prisma.event.update({
      where: { id: eventId },
      data: { tintOverride: presetKey, tintTop: tint.tintTop, tintMid: tint.tintMid, tintAccent: tint.tintAccent },
    });
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/edit`);
  return { ok: true };
}
