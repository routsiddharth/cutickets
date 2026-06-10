import { prisma } from "@/lib/prisma";
import { NEW_ACCOUNT_AGE_DAYS } from "@/lib/constants";

export type Reputation = {
  ratingAvg: number | null;
  ratingCount: number;
  tradesCompleted: number;
  memberSince: Date;
  isNewAccount: boolean;
};

export function accountAgeDays(createdAt: Date): number {
  return (Date.now() - createdAt.getTime()) / 86_400_000;
}

export function isNewAccount(createdAt: Date): boolean {
  return accountAgeDays(createdAt) < NEW_ACCOUNT_AGE_DAYS;
}

/**
 * The single definition of "a completed trade": a COMPLETED match where the
 * user is on either side. `getReputation` and the event-market view both read
 * trade counts from here so a user's profile and listing badges can't drift.
 */
export async function countCompletedTrades(userId: string): Promise<number> {
  return prisma.match.count({
    where: {
      status: "COMPLETED",
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
  });
}

/** Aggregate a user's reputation from ratings + completed matches. */
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

  const tradesCompleted = await countCompletedTrades(userId);

  return {
    ratingAvg: ratingAgg._avg.stars,
    ratingCount: ratingAgg._count._all,
    tradesCompleted,
    memberSince: createdAt,
    isNewAccount: isNewAccount(createdAt),
  };
}
