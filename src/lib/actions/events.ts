"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";

import type { ActionState } from "./types";
export type { ActionState };

const schema = z.object({
  name: z.string().trim().min(2, "Event name is too short").max(120),
  venue: z.string().trim().max(120).optional(),
  startsAt: z.string().trim().optional(),
  description: z.string().trim().max(500).optional(),
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let startsAt: Date | null = null;
  if (parsed.data.startsAt) {
    const d = new Date(parsed.data.startsAt);
    if (!Number.isNaN(d.getTime())) startsAt = d;
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
      startsAt,
      createdById: user.id,
    },
  });

  redirect(`/events/${event.id}`);
}
