import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseDeal } from "@/lib/deals";
import { notify, notifyEventWatchersIfAvailable } from "@/lib/notifications";
import { RESERVATION_EXPIRING_SOON_MS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const stale = await prisma.deal.findMany({
    where: { status: "RESERVED", reservationExpiresAt: { lt: now } },
    select: {
      id: true,
      eventId: true,
      listingId: true,
      quantity: true,
      buyerId: true,
      sellerId: true,
      event: { select: { name: true } },
    },
  });

  let expired = 0;
  for (const deal of stale) {
    await prisma.$transaction(async (tx) => {
      const released = await releaseDeal(tx, deal, "EXPIRED");
      if (!released) return;
      expired++;
      for (const userId of [deal.buyerId, deal.sellerId]) {
        await notify({ userId, type: "DEAL_CANCELLED", dealId: deal.id, body: `The ${deal.event.name} reservation expired` }, tx);
      }
      await notifyEventWatchersIfAvailable(deal.eventId, deal.event.name, tx);
    });
  }

  const soon = await prisma.deal.findMany({
    where: {
      status: "RESERVED",
      reservationExpiresAt: { gt: now, lt: new Date(now.getTime() + RESERVATION_EXPIRING_SOON_MS) },
      expiringSoonNotifiedAt: null,
    },
    select: { id: true, buyerId: true, sellerId: true, event: { select: { name: true } } },
  });
  for (const deal of soon) {
    await prisma.$transaction(async (tx) => {
      const marked = await tx.deal.updateMany({
        where: { id: deal.id, status: "RESERVED", expiringSoonNotifiedAt: null },
        data: { expiringSoonNotifiedAt: now },
      });
      if (!marked.count) return;
      for (const userId of [deal.buyerId, deal.sellerId]) {
        await notify({ userId, type: "RESERVATION_EXPIRING", dealId: deal.id, body: `The ${deal.event.name} reservation expires in under 4 hours`, collapse: true }, tx);
      }
    });
  }

  return NextResponse.json({ ok: true, expired, nudged: soon.length });
}
