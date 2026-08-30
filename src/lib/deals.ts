import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Restore a cancelled or expired reservation to its listing when possible. */
export async function releaseDeal(
  client: DbClient,
  deal: { id: string; listingId: string; quantity: number },
  status: "CANCELLED" | "EXPIRED",
): Promise<boolean> {
  const changed = await client.deal.updateMany({
    where: { id: deal.id, status: "RESERVED" },
    data: { status },
  });
  if (changed.count === 0) return false;

  await client.listing.updateMany({
    where: {
      id: deal.listingId,
      status: { in: ["OPEN", "SOLD_OUT"] },
      expiresAt: { gt: new Date() },
    },
    data: { availableQuantity: { increment: deal.quantity }, status: "OPEN" },
  });
  return true;
}

export function dealParty(
  deal: { buyerId: string; sellerId: string },
  userId: string,
) {
  const isBuyer = deal.buyerId === userId;
  const isSeller = deal.sellerId === userId;
  return {
    isBuyer,
    isSeller,
    authorized: isBuyer || isSeller,
    otherId: isBuyer ? deal.sellerId : deal.buyerId,
  };
}
