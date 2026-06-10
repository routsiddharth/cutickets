import { prisma } from "@/lib/prisma";

export type Reputation = {
  ratingAvg: number | null;
  ratingCount: number;
  tradesCompleted: number;
  memberSince: Date;
  isNewAccount: boolean;
};

import { NEW_ACCOUNT_AGE_DAYS } from "@/lib/constants";

export function accountAgeDays(createdAt: Date): number {
  return (Date.now() - createdAt.getTime()) / 86_400_000;
}

export function isNewAccount(createdAt: Date): boolean {
  return accountAgeDays(createdAt) < NEW_ACCOUNT_AGE_DAYS;
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

  const tradesCompleted = await prisma.match.count({
    where: {
      status: "COMPLETED",
      OR: [{ interestedId: userId }, { ownerId: userId }],
    },
  });

  return {
    ratingAvg: ratingAgg._avg.stars,
    ratingCount: ratingAgg._count._all,
    tradesCompleted,
    memberSince: createdAt,
    isNewAccount: isNewAccount(createdAt),
  };
}
