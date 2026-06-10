/**
 * Which side of a match a user is on — the single source of truth for match
 * authorization and "buyer vs seller" display. `otherId` is only meaningful when
 * `authorized` is true (callers check that first).
 */
export function matchParty(
  match: { buyerId: string; sellerId: string },
  userId: string,
) {
  const isBuyer = match.buyerId === userId;
  const isSeller = match.sellerId === userId;
  return {
    isBuyer,
    isSeller,
    authorized: isBuyer || isSeller,
    otherId: isBuyer ? match.sellerId : match.buyerId,
  };
}
