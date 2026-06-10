import { prisma } from "@/lib/prisma";

/** Active = not sold/cancelled, and not past its expiry. */
function activeListingWhere(now = new Date()) {
  return { status: "ACTIVE", expiresAt: { gt: now } } as const;
}

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
      where: { eventId, type: "SELL", ...activeListingWhere(now) },
      _sum: { quantity: true },
      _count: { _all: true },
    }),
    prisma.listing.aggregate({
      where: { eventId, type: "BUY", ...activeListingWhere(now) },
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
    where: { eventId, ...activeListingWhere(now) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          school: true,
          classYear: true,
          createdAt: true,
        },
      },
    },
  });

  // Attach lightweight reputation (rating avg + trade count) per listing owner.
  const ownerIds = [...new Set(listings.map((l) => l.userId))];
  const [ratings, trades] = await Promise.all([
    prisma.rating.groupBy({
      by: ["subjectId"],
      where: { subjectId: { in: ownerIds } },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    prisma.match.groupBy({
      by: ["interestedId"],
      where: { status: "COMPLETED", interestedId: { in: ownerIds } },
      _count: { _all: true },
    }),
  ]);
  // trades counts both sides; compute a simple per-user completed count.
  const completedByUser = await completedTradeCounts(ownerIds);

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

  // void unused to keep tree-shaking honest
  void trades;
  return { sell, buy };
}

async function completedTradeCounts(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ interestedId: { in: userIds } }, { ownerId: { in: userIds } }],
    },
    select: { interestedId: true, ownerId: true },
  });
  const counts = new Map<string, number>();
  for (const m of matches) {
    for (const uid of [m.interestedId, m.ownerId]) {
      if (userIds.includes(uid)) counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }
  }
  return counts;
}
