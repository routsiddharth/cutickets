import { prisma } from "@/lib/prisma";
import { purchasableListingWhere } from "@/lib/listing";

export type EventStats = {
  ticketsAvailable: number;
  listingCount: number;
  lowestPriceCents: number | null;
  salesCount: number;
  lastSaleCents: number | null;
};

export async function getLastSaleCents(eventId: string): Promise<number | null> {
  const lastSale = await prisma.deal.findFirst({
    where: { status: "COMPLETED", eventId },
    orderBy: { completedAt: "desc" },
    select: { unitPriceCents: true },
  });
  return lastSale?.unitPriceCents ?? null;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const where = { eventId, ...purchasableListingWhere() };
  const [inventory, lowest, salesCount, lastSaleCents] = await Promise.all([
    prisma.listing.aggregate({
      where,
      _sum: { availableQuantity: true },
      _count: { _all: true },
    }),
    prisma.listing.findFirst({
      where,
      orderBy: [{ priceCents: "asc" }, { postedAt: "asc" }],
      select: { priceCents: true },
    }),
    prisma.deal.count({ where: { eventId, status: "COMPLETED" } }),
    getLastSaleCents(eventId),
  ]);
  return {
    ticketsAvailable: inventory._sum.availableQuantity ?? 0,
    listingCount: inventory._count._all,
    lowestPriceCents: lowest?.priceCents ?? null,
    salesCount,
    lastSaleCents,
  };
}

export async function getListingsForEvent(eventId: string) {
  return prisma.listing.findMany({
    where: { eventId, ...purchasableListingWhere() },
    orderBy: [{ priceCents: "asc" }, { postedAt: "asc" }],
    select: {
      id: true,
      sellerId: true,
      availableQuantity: true,
      priceCents: true,
      postedAt: true,
    },
  });
}

const RECENT_SALES_LIMIT = 5;

/** The event page's price-sorted list interleaves live listings with a handful of recent sales ("GONE" rows). */
export async function getRecentSalesForEvent(eventId: string) {
  return prisma.deal.findMany({
    where: { eventId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: RECENT_SALES_LIMIT,
    select: {
      id: true,
      quantity: true,
      unitPriceCents: true,
      completedAt: true,
    },
  });
}

export async function getEventsWithStats(query?: string) {
  const events = await prisma.event.findMany({
    where: {
      archivedAt: null,
      ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const stats = await Promise.all(events.map((event) => getEventStats(event.id)));
  return events.map((event, index) => ({ event, stats: stats[index] }));
}

export function getMyListingsForEvent(eventId: string, sellerId: string) {
  return prisma.listing.findMany({
    where: { eventId, sellerId, ...purchasableListingWhere() },
    orderBy: { postedAt: "desc" },
  });
}

const WEEKLY_VIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Logs one page view and returns the raw (non-deduped) view count for the trailing 7 days, inclusive of this one. */
export async function recordEventViewAndGetWeeklyCount(eventId: string): Promise<number> {
  await prisma.eventView.create({ data: { eventId } });
  return prisma.eventView.count({
    where: { eventId, viewedAt: { gte: new Date(Date.now() - WEEKLY_VIEW_WINDOW_MS) } },
  });
}
