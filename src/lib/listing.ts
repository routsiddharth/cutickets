/** Listings that still count toward a seller's active-listing cap. */
export function availableListingWhere(now: Date = new Date()) {
  return { status: "OPEN", expiresAt: { gt: now }, availableQuantity: { gt: 0 } } as const;
}

/** Public inventory that a buyer can reserve right now. */
export function purchasableListingWhere(now: Date = new Date()) {
  return { status: "OPEN", expiresAt: { gt: now }, availableQuantity: { gt: 0 } } as const;
}
