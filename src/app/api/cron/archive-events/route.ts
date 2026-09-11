import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { archiveEventCore } from "@/lib/events";
import { startOfZonedDay } from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Events archive the day after they happen — anything that started before
  // today's NYC calendar day is fair game once this runs, around 4am NYC.
  const cutoff = startOfZonedDay(new Date());
  const events = await prisma.event.findMany({
    where: { archivedAt: null, startsAt: { not: null, lt: cutoff } },
    select: { id: true, name: true, listings: { where: { status: "OPEN" }, select: { sellerId: true } } },
  });

  for (const event of events) {
    await prisma.$transaction((tx) => archiveEventCore(tx, event));
  }

  return NextResponse.json({ ok: true, archived: events.length });
}
