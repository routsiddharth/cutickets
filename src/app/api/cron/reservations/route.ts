import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMatch, sweepExpiredReservations } from "@/lib/matching";
import { notify } from "@/lib/notifications";
import { RESERVATION_EXPIRING_SOON_MS } from "@/lib/constants";

// Prisma needs the Node runtime; never cache a job route.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reservation sweeper — runs on a Vercel Cron schedule (see vercel.json). On the
 * Hobby plan crons run at most once per day, so this is the BACKSTOP: stale
 * reservations are also swept on the order-placement path (see createListing /
 * sweepExpiredReservations). This job catches events with no live activity.
 *  1. Expire reservations whose 24h accept window has lapsed without both
 *     parties confirming: free the tickets and roll them to the next in queue.
 *  2. Nudge anyone who still hasn't confirmed a reservation with <4h left.
 *
 * Secured by CRON_SECRET: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically when the env var is set. Idempotent — safe to run on overlap.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── 1. Expire stale reservations (grouped by event, under the event lock) ──
  const staleEvents = await prisma.match.findMany({
    where: { status: "RESERVED", reservationExpiresAt: { lt: now } },
    select: { eventId: true },
    distinct: ["eventId"],
  });

  let expired = 0;
  for (const { eventId } of staleEvents) {
    expired += await runMatch(eventId, (tx) => sweepExpiredReservations(tx, eventId, now));
  }

  // ── 2. "Expiring soon" nudges ─────────────────────────────────────────────
  const soon = await prisma.match.findMany({
    where: {
      status: "RESERVED",
      reservationExpiresAt: { gt: now, lt: new Date(now.getTime() + RESERVATION_EXPIRING_SOON_MS) },
      expiringSoonNotifiedAt: null,
    },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      buyerAccepted: true,
      sellerAccepted: true,
      event: { select: { name: true } },
    },
  });

  let nudged = 0;
  for (const m of soon) {
    // Only nudge the side(s) that haven't confirmed yet.
    const targets: string[] = [];
    if (!m.buyerAccepted) targets.push(m.buyerId);
    if (!m.sellerAccepted) targets.push(m.sellerId);
    for (const uid of targets) {
      await notify({
        userId: uid,
        type: "RESERVATION_EXPIRING",
        matchId: m.id,
        body: `Less than 4 hours left to confirm your ${m.event.name} match before it rolls to the next person`,
        collapse: true,
      });
    }
    await prisma.match.update({
      where: { id: m.id },
      data: { expiringSoonNotifiedAt: now },
    });
    if (targets.length) nudged++;
  }

  return NextResponse.json({ ok: true, expired, nudged });
}
