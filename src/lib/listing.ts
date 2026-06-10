/**
 * The single source of truth for "is this order live on the book?" An order is
 * available iff it is OPEN and has not passed its expiry. A Prisma `where`
 * fragment for queries.
 */
export function availableListingWhere(now: Date = new Date()) {
  return { status: "OPEN", expiresAt: { gt: now } } as const;
}

/**
 * Live AND still has tickets the engine can reserve — i.e. `available` plus a
 * positive remaining quantity (an order with remainingQuantity 0 is fully
 * reserved and off the book even though its status is still OPEN).
 */
export function matchableListingWhere(now: Date = new Date()) {
  return { status: "OPEN", expiresAt: { gt: now }, remainingQuantity: { gt: 0 } } as const;
}
