import { prisma } from "@/lib/prisma";
import { matchableListingWhere } from "@/lib/listing";

export type EventStats = {
  sellTickets: number; //   live tickets available to buy (sum of remaining asks)
  buyTickets: number; //    live tickets wanted (sum of remaining bids)
  sellOrders: number; //    number of live asks
  buyOrders: number; //     number of live bids
  bestAskCents: number | null; // lowest ask → "Buy now for $X"
  bestBidCents: number | null; // highest bid → "Sell now for $X"
  lastSaleCents: number | null; // most recent completed trade price
  aroundPriceCents: number | null; // friendly "selling around $X" hint
};

export async function getLastSaleCents(eventId: string): Promise<number | null> {
  const lastTrade = await prisma.match.findFirst({
    where: { status: "COMPLETED", agreedPriceCents: { not: null }, eventId },
    orderBy: { completedAt: "desc" },
    select: { agreedPriceCents: true },
  });
  return lastTrade?.agreedPriceCents ?? null;
}

/** The best (cheapest) live ask price — what someone can buy for right now. */
export async function getBestAskCents(eventId: string, now: Date = new Date()): Promise<number | null> {
  const ask = await prisma.listing.findFirst({
    where: { eventId, type: "SELL", ...matchableListingWhere(now) },
    orderBy: [{ priceCents: "asc" }, { postedAt: "asc" }],
    select: { priceCents: true },
  });
  return ask?.priceCents ?? null;
}

/** The best (highest) live bid price — what someone can sell for right now. */
export async function getBestBidCents(eventId: string, now: Date = new Date()): Promise<number | null> {
  const bid = await prisma.listing.findFirst({
    where: { eventId, type: "BUY", ...matchableListingWhere(now) },
    orderBy: [{ priceCents: "desc" }, { postedAt: "asc" }],
    select: { priceCents: true },
  });
  return bid?.priceCents ?? null;
}

/**
 * A single friendly price to anchor the market — "tickets are selling around
 * $X". Prefer the last real sale; otherwise the midpoint of the live spread;
 * otherwise whichever single side exists.
 */
function aroundPrice(
  lastSaleCents: number | null,
  bestBidCents: number | null,
  bestAskCents: number | null,
): number | null {
  if (lastSaleCents !== null) return lastSaleCents;
  if (bestBidCents !== null && bestAskCents !== null) {
    return Math.round((bestBidCents + bestAskCents) / 2);
  }
  return bestAskCents ?? bestBidCents ?? null;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const now = new Date();
  const [sellAgg, buyAgg, bestAskCents, bestBidCents, lastSaleCents] = await Promise.all([
    prisma.listing.aggregate({
      where: { eventId, type: "SELL", ...matchableListingWhere(now) },
      _sum: { remainingQuantity: true },
      _count: { _all: true },
    }),
    prisma.listing.aggregate({
      where: { eventId, type: "BUY", ...matchableListingWhere(now) },
      _sum: { remainingQuantity: true },
      _count: { _all: true },
    }),
    getBestAskCents(eventId, now),
    getBestBidCents(eventId, now),
    getLastSaleCents(eventId),
  ]);

  return {
    sellTickets: sellAgg._sum.remainingQuantity ?? 0,
    buyTickets: buyAgg._sum.remainingQuantity ?? 0,
    sellOrders: sellAgg._count._all,
    buyOrders: buyAgg._count._all,
    bestAskCents,
    bestBidCents,
    lastSaleCents,
    aroundPriceCents: aroundPrice(lastSaleCents, bestBidCents, bestAskCents),
  };
}

/** Events for the browse page, with summary stats, soonest event first. */
export async function getEventsWithStats(query?: string) {
  const events = await prisma.event.findMany({
    where: query ? { name: { contains: query } } : undefined,
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const stats = await Promise.all(events.map((e) => getEventStats(e.id)));
  return events.map((event, i) => ({ event, stats: stats[i] }));
}

/**
 * The live orders a given user has on one event (for the "your orders" strip on
 * the event page) that still have tickets on the book. Uses `matchableListingWhere`
 * so a fully-reserved order (remainingQuantity 0, still OPEN) isn't shown as
 * "0 · live" — it appears in the "you matched" strip instead.
 */
export async function getMyOrdersForEvent(eventId: string, userId: string) {
  return prisma.listing.findMany({
    where: { eventId, userId, ...matchableListingWhere() },
    orderBy: { postedAt: "desc" },
  });
}
