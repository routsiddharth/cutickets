import { prisma } from "@/lib/prisma";
import { NEW_ACCOUNT_AGE_DAYS } from "@/lib/constants";
import { soldDealWhere } from "@/lib/deals";

export type Reputation = {
  ratingAvg: number | null;
  ratingCount: number;
  salesCompleted: number;
  memberSince: Date;
  isNewAccount: boolean;
};

export function accountAgeDays(createdAt: Date): number {
  return (Date.now() - createdAt.getTime()) / 86_400_000;
}

export function isNewAccount(createdAt: Date): boolean {
  return accountAgeDays(createdAt) < NEW_ACCOUNT_AGE_DAYS;
}

export async function countSales(userId: string): Promise<number> {
  return prisma.deal.count({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      ...soldDealWhere(),
    },
  });
}

/** Aggregate a user's reputation from ratings + sales. */
export async function getReputation(userId: string): Promise<Reputation> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  const createdAt = user?.createdAt ?? new Date();

  const ratingAgg = await prisma.rating.aggregate({
    where: { subjectId: userId },
    _avg: { stars: true },
    _count: { _all: true },
  });

  const salesCompleted = await countSales(userId);

  return {
    ratingAvg: ratingAgg._avg.stars,
    ratingCount: ratingAgg._count._all,
    salesCompleted,
    memberSince: createdAt,
    isNewAccount: isNewAccount(createdAt),
  };
}
