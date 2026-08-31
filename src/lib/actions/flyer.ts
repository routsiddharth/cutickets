"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { convertFlyerImage, FlyerImageError, FLYER_CONTENT_TYPE, FLYER_MAX_UPLOAD_BYTES } from "@/lib/flyer";
import type { ActionState } from "./types";

export async function uploadEventFlyer(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
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

  await prisma.$transaction([
    prisma.eventFlyer.upsert({
      where: { eventId },
      create: { eventId, data: converted, contentType: FLYER_CONTENT_TYPE },
      update: { data: converted, contentType: FLYER_CONTENT_TYPE },
    }),
    prisma.event.update({ where: { id: eventId }, data: { flyerUpdatedAt: new Date() } }),
  ]);

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/edit`);
  return { ok: true };
}

export async function removeEventFlyer(eventId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };

  await prisma.$transaction([
    prisma.eventFlyer.deleteMany({ where: { eventId } }),
    prisma.event.update({ where: { id: eventId }, data: { flyerUpdatedAt: null } }),
  ]);

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/edit`);
  return { ok: true };
}
