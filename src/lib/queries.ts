import { prisma } from "@/lib/prisma";
import { availableListingWhere } from "@/lib/listing";

export type EventStats = {
  sellTickets: number;
  buyTickets: number;
  sellListings: number;
  buyListings: number;
  lastSaleCents: number | null;
};

export async function getLastSaleCents(eventId: string): Promise<number | null> {
  const lastTrade = await prisma.match.findFirst({
    where: {
      status: "COMPLETED",
      agreedPriceCents: { not: null },
      listing: { eventId },
    },
    orderBy: { completedAt: "desc" },
    select: { agreedPriceCents: true },
  });
  return lastTrade?.agreedPriceCents ?? null;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const now = new Date();
  const [sellAgg, buyAgg, lastSaleCents] = await Promise.all([
    prisma.listing.aggregate({
      where: { eventId, type: "SELL", ...availableListingWhere(now) },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
    prisma.listing.aggregate({
      where: { eventId, type: "BUY", ...availableListingWhere(now) },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
    getLastSaleCents(eventId),
  ]);

  return {
    sellTickets: sellAgg._sum.quantity ?? 0,
    buyTickets: buyAgg._sum.quantity ?? 0,
    sellListings: sellAgg._count._all,
    buyListings: buyAgg._count._all,
    lastSaleCents,
  };
}

/** Events for the browse page, with summary stats, newest event first. */
export async function getEventsWithStats(query?: string) {
  const events = await prisma.event.findMany({
    where: query
      ? { name: { contains: query } }
      : undefined,
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const stats = await Promise.all(events.map((e) => getEventStats(e.id)));
  return events.map((event, i) => ({ event, stats: stats[i] }));
}

export type MarketListing = Awaited<ReturnType<typeof getEventMarket>>["sell"][number];

/**
 * The two-sided order book for a single event. The market is *anonymous*: a
 * listing exposes only the ticket terms (type / quantity / price / notes /
 * expiry) and never the lister's identity or reputation. Who you're dealing
 * with is revealed only after a match is accepted (see the deal desk). We
 * deliberately don't even `include` the user here, so identity can't leak.
 */
export async function getEventMarket(eventId: string) {
  const now = new Date();
  const listings = await prisma.listing.findMany({
    where: { eventId, ...availableListingWhere(now) },
  });

  const sell = listings
    .filter((l) => l.type === "SELL")
    .sort((a, b) => a.priceCents - b.priceCents); // cheapest ask first

  const buy = listings
    .filter((l) => l.type === "BUY")
    .sort((a, b) => b.priceCents - a.priceCents); // highest bid first

  return { sell, buy };
}
