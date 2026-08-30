import { prisma } from "@/lib/prisma";
import { purchasableListingWhere } from "@/lib/listing";

export type EventStats = {
  ticketsAvailable: number;
  listingCount: number;
  lowestPriceCents: number | null;
  lastSaleCents: number | null;
};

export async function getLastSaleCents(eventId: string): Promise<number | null> {
  const lastTrade = await prisma.deal.findFirst({
    where: { status: "COMPLETED", eventId },
    orderBy: { completedAt: "desc" },
    select: { unitPriceCents: true },
  });
  return lastTrade?.unitPriceCents ?? null;
}

export async function getEventStats(eventId: string): Promise<EventStats> {
  const where = { eventId, ...purchasableListingWhere() };
  const [inventory, lowest, lastSaleCents] = await Promise.all([
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
    getLastSaleCents(eventId),
  ]);
  return {
    ticketsAvailable: inventory._sum.availableQuantity ?? 0,
    listingCount: inventory._count._all,
    lowestPriceCents: lowest?.priceCents ?? null,
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

export function getSalesCount(eventId: string): Promise<number> {
  return prisma.deal.count({ where: { eventId, status: "COMPLETED" } });
}

export function getMyListingsForEvent(eventId: string, sellerId: string) {
  return prisma.listing.findMany({
    where: { eventId, sellerId, ...purchasableListingWhere() },
    orderBy: { postedAt: "desc" },
  });
}
