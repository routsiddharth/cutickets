"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { notify } from "@/lib/notifications";
import { ADMIN_EMAILS, isAdmin } from "@/lib/admin";

import type { ActionState } from "./types";
export type { ActionState };

const schema = z.object({
  name: z.string().trim().min(2, "Event name is too short").max(120),
  venue: z.string().trim().max(120).optional(),
  startsAt: z.string().trim().min(1, "Pick the event date"),
  description: z.string().trim().max(500).optional(),
  poshLink: z.string().trim().url("Enter a valid URL (e.g. https://posh.vip/e/your-event)").max(500).optional(),
});

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    venue: formData.get("venue") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    description: formData.get("description") || undefined,
    poshLink: formData.get("poshLink") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // An event date is required and drives listing expiry, so it must be a real,
  // future date — a past event would make every listing expire immediately.
  // The form sends a date-only value ("YYYY-MM-DD"); treat it as local midnight
  // of that calendar day rather than UTC midnight.
  const raw = parsed.data.startsAt;
  const startsAt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Enter a valid date" };
  }
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (startsAt.getTime() < startOfToday.getTime()) {
    return { error: "Event date must be in the future" };
  }

  // Avoid fragmenting liquidity: if an event with the same name (ignoring case
  // and surrounding whitespace) already exists, send the user to it instead of
  // creating a duplicate market. SQLite string compares are case-sensitive, so
  // we normalize in JS.
  const normalized = parsed.data.name.toLowerCase();
  const candidates = await prisma.event.findMany({ select: { id: true, name: true } });
  const existing = candidates.find((e) => e.name.trim().toLowerCase() === normalized);
  if (existing) {
    redirect(`/events/${existing.id}`);
  }

  const event = await prisma.event.create({
    data: {
      name: parsed.data.name,
      venue: parsed.data.venue ?? null,
      description: parsed.data.description ?? null,
      poshLink: parsed.data.poshLink ?? null,
      startsAt,
      createdById: user.id,
    },
  });

  // Notify admins so they can review and verify the event.
  const adminUsers = await prisma.user.findMany({
    where: { email: { in: [...ADMIN_EMAILS] } },
    select: { id: true },
  });
  await Promise.all(
    adminUsers.map((admin) =>
      notify({
        userId: admin.id,
        type: "EVENT_VERIFICATION_REQUEST",
        body: `New event submitted: "${event.name}" — review in Admin Events`,
      }),
    ),
  );

  redirect(`/events/${event.id}`);
}

export async function verifyEvent(eventId: string, _formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!isAdmin(user.email)) return;

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { verified: true, verifiedAt: new Date(), verifiedById: user.id },
    select: { name: true, createdById: true },
  });

  // Let the submitter know their event was verified.
  await notify({
    userId: event.createdById,
    type: "EVENT_VERIFIED",
    body: `Your event "${event.name}" has been verified ✓`,
  });

  revalidatePath("/admin/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}
