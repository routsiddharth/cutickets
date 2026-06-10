import { prisma } from "@/lib/prisma";
import { availableListingWhere } from "@/lib/listing";
import { PUBLIC_USER_SELECT } from "@/lib/public-profile";
import { countCompletedTradesByUser } from "@/lib/reputation";

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

/** The two-sided order book for a single event. */
export async function getEventMarket(eventId: string) {
  const now = new Date();
  const listings = await prisma.listing.findMany({
    where: { eventId, ...availableListingWhere(now) },
    // PUBLIC_USER_SELECT excludes `email` by construction — the market view
    // never carries a lister's email (revealed only on mutual interest).
    include: { user: { select: PUBLIC_USER_SELECT } },
  });

  // Attach lightweight reputation (rating avg + completed-trade count) per owner.
  const ownerIds = [...new Set(listings.map((l) => l.userId))];
  const [ratings, completedByUser] = await Promise.all([
    prisma.rating.groupBy({
      by: ["subjectId"],
      where: { subjectId: { in: ownerIds } },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    countCompletedTradesByUser(ownerIds),
  ]);

  const ratingMap = new Map(ratings.map((r) => [r.subjectId, r]));

  const decorate = (l: (typeof listings)[number]) => ({
    ...l,
    ownerRatingAvg: ratingMap.get(l.userId)?._avg.stars ?? null,
    ownerRatingCount: ratingMap.get(l.userId)?._count._all ?? 0,
    ownerTrades: completedByUser.get(l.userId) ?? 0,
  });

  const sell = listings
    .filter((l) => l.type === "SELL")
    .map(decorate)
    .sort((a, b) => a.priceCents - b.priceCents); // cheapest ask first

  const buy = listings
    .filter((l) => l.type === "BUY")
    .map(decorate)
    .sort((a, b) => b.priceCents - a.priceCents); // highest bid first

  return { sell, buy };
}
