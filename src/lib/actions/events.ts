"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { notify } from "@/lib/notifications";
import { isAdmin } from "@/lib/admin";

import type { ActionState } from "./types";
export type { ActionState };

const eventSchema = z.object({
  name: z.string().trim().min(2, "Event name is too short").max(120),
  host: z.string().trim().max(120).optional(),
  venue: z.string().trim().max(120).optional(),
  startsAt: z.string().trim().min(1, "Pick the event date"),
  startsTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a valid start time"),
  description: z.string().trim().max(500).optional(),
  poshLink: z.string().trim().url("Enter a valid URL (e.g. https://posh.vip/e/your-event)").max(500).optional(),
});

const requestSchema = z.object({
  name: z.string().trim().min(2, "Event name is too short").max(120),
  venue: z.string().trim().max(120).optional(),
  startsAt: z.string().trim().optional(),
  details: z.string().trim().max(500).optional(),
});

function parseDate(raw: string, required: boolean): Date | null | undefined {
  if (!raw) return required ? undefined : null;
  const value = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

function isPastDate(value: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return value.getTime() < today.getTime();
}

function eventData(formData: FormData) {
  return eventSchema.safeParse({
    name: formData.get("name"),
    host: formData.get("host") || undefined,
    venue: formData.get("venue") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    startsTime: formData.get("startsTime") || undefined,
    description: formData.get("description") || undefined,
    poshLink: formData.get("poshLink") || undefined,
  });
}

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");
  if (!isAdmin(user)) return { error: "Only Morningside Tickets admins can add new events." };

  const parsed = eventData(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const startsAt = parseDate(`${parsed.data.startsAt}T${parsed.data.startsTime}:00`, true);
  if (!startsAt) return { error: "Enter a valid date" };
  if (isPastDate(startsAt)) return { error: "Event date must be in the future" };

  const existing = await prisma.event.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" }, archivedAt: null },
    select: { id: true },
  });
  if (existing) redirect(`/events/${existing.id}`);

  const requestId = z.string().min(1).safeParse(formData.get("requestId"));
  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({
      data: {
        name: parsed.data.name,
        host: parsed.data.host ?? null,
        venue: parsed.data.venue ?? null,
        description: parsed.data.description ?? null,
        poshLink: parsed.data.poshLink ?? null,
        startsAt,
        createdById: user.id,
      },
    });

    if (requestId.success) {
      const request = await tx.eventRequest.findFirst({
        where: { id: requestId.data, status: "PENDING" },
        select: { id: true, requesterId: true },
      });
      if (request) {
        await tx.eventRequest.update({
          where: { id: request.id },
          data: { status: "FULFILLED", eventId: created.id, resolvedById: user.id, resolvedAt: new Date() },
        });
        await notify({
          userId: request.requesterId,
          type: "EVENT_REQUEST_FULFILLED",
          body: `The event you requested, “${created.name},” is now on Morningside Tickets.`,
          eventId: created.id,
        }, tx);
      }
    }
    return created;
  });

  redirect(`/events/${event.id}`);
}

export async function updateEvent(
  eventId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };
  const parsed = eventData(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const startsAt = parseDate(`${parsed.data.startsAt}T${parsed.data.startsTime}:00`, true);
  if (!startsAt) return { error: "Enter a valid date" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return { error: "Event not found" };
  await prisma.event.update({
    where: { id: eventId },
    data: {
      name: parsed.data.name,
      host: parsed.data.host ?? null,
      venue: parsed.data.venue ?? null,
      startsAt,
      description: parsed.data.description ?? null,
      poshLink: parsed.data.poshLink ?? null,
    },
  });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  return { ok: true };
}

export async function archiveEvent(eventId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, archivedAt: true, listings: { where: { status: "OPEN" }, select: { sellerId: true } } },
  });
  if (!event) return { error: "Event not found" };
  if (event.archivedAt) return { error: "Event is already archived" };

  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id: eventId }, data: { archivedAt: new Date() } });
    await tx.listing.updateMany({ where: { eventId, status: "OPEN" }, data: { status: "CANCELLED", availableQuantity: 0 } });
    const affectedUsers = [...new Set(event.listings.map((listing) => listing.sellerId))];
    await Promise.all(affectedUsers.map((userId) => notify({
      userId,
      type: "EVENT_ARCHIVED",
      body: `“${event.name}” was archived, so your open order was cancelled.`,
      eventId,
    }, tx)));
  });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  return { ok: true };
}

export async function restoreEvent(eventId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };
  const result = await prisma.event.updateMany({ where: { id: eventId, archivedAt: { not: null } }, data: { archivedAt: null } });
  if (result.count === 0) return { error: "Archived event not found" };
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  return { ok: true };
}

export async function requestEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");
  const parsed = requestSchema.safeParse({
    name: formData.get("name"),
    venue: formData.get("venue") || undefined,
    startsAt: formData.get("startsAt") || undefined,
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const startsAt = parseDate(parsed.data.startsAt ?? "", false);
  if (startsAt === undefined) return { error: "Enter a valid date" };
  if (startsAt && isPastDate(startsAt)) return { error: "Event date must be in the future" };

  const existingEvent = await prisma.event.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" }, archivedAt: null },
    select: { id: true },
  });
  if (existingEvent) redirect(`/events/${existingEvent.id}`);

  const [duplicate, pendingCount] = await Promise.all([
    prisma.eventRequest.findFirst({
      where: { requesterId: user.id, status: "PENDING", name: { equals: parsed.data.name, mode: "insensitive" } },
      select: { id: true },
    }),
    prisma.eventRequest.count({ where: { requesterId: user.id, status: "PENDING" } }),
  ]);
  if (duplicate) return { error: "You already requested this event." };
  if (pendingCount >= 5) return { error: "You can have up to 5 pending event requests." };

  await prisma.eventRequest.create({
    data: {
      requesterId: user.id,
      name: parsed.data.name,
      venue: parsed.data.venue ?? null,
      startsAt,
      details: parsed.data.details ?? null,
    },
  });
  revalidatePath("/admin/events");
  return { ok: true };
}

/** Subscribes the current user to a one-time notification for the event's next listing. */
export async function watchEvent(eventId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { archivedAt: true } });
  if (!event) return { error: "Event not found" };
  if (event.archivedAt) return { error: "This event is archived" };

  await prisma.eventWatch.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id },
    update: {},
  });
  return { ok: true };
}

export async function dismissEventRequest(requestId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!isAdmin(user)) return { error: "Not authorized" };
  const request = await prisma.eventRequest.findFirst({
    where: { id: requestId, status: "PENDING" },
    select: { id: true, requesterId: true, name: true },
  });
  if (!request) return { error: "Pending request not found" };
  await prisma.$transaction(async (tx) => {
    await tx.eventRequest.update({
      where: { id: request.id },
      data: { status: "DISMISSED", resolvedById: user.id, resolvedAt: new Date() },
    });
    await notify({
      userId: request.requesterId,
      type: "EVENT_REQUEST_DISMISSED",
      body: `Your request for “${request.name}” wasn’t added to Morningside Tickets.`,
    }, tx);
  });
  revalidatePath("/admin/events");
  return { ok: true };
}

// Form-friendly adapters for progressive-enhancement controls that remain on
// the admin page and do not need to render action state.
export async function archiveEventForm(eventId: string, _formData: FormData): Promise<void> {
  await archiveEvent(eventId);
}

export async function restoreEventForm(eventId: string, _formData: FormData): Promise<void> {
  await restoreEvent(eventId);
}

export async function dismissEventRequestForm(requestId: string, _formData: FormData): Promise<void> {
  await dismissEventRequest(requestId);
}
