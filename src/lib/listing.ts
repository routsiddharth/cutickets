import type { Listing } from "@prisma/client";

/**
 * The single source of truth for "is this listing available to interact with?"
 * A listing is available iff it is ACTIVE and has not passed its expiry. Used as
 * both a Prisma `where` fragment (for queries) and an in-memory predicate (for
 * actions that already hold a listing). Keep these two in lock-step — they
 * encode the same invariant.
 */
export function availableListingWhere(now: Date = new Date()) {
  return { status: "ACTIVE", expiresAt: { gt: now } } as const;
}

export function isListingAvailable(
  listing: Pick<Listing, "status" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  return listing.status === "ACTIVE" && listing.expiresAt > now;
}
