import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type NotificationType =
  | "MATCH_FOUND" //                 the engine auto-matched you — confirm to lock it in
  | "OFFER_ACCEPTED" //              your counterparty confirmed the match
  | "RESERVATION_EXPIRING" //        <4h left to confirm before it rolls to the next person
  | "NEW_MESSAGE"
  | "TRADE_CONFIRMED"
  | "TRADE_COMPLETED"
  | "EVENT_VERIFICATION_REQUEST" //  admin: a new event needs review
  | "EVENT_VERIFIED" //              submitter: your event was verified
  | "LISTING_KILLED" //              a moderator removed your listing
  | "TRADE_ADMIN_CANCELLED" //       a moderator cancelled your active match
  | "ADMIN_ROLE_GRANTED"; //         you've been granted admin access

/**
 * Create an in-app notification. Pass a `tx` to enlist it in a surrounding
 * transaction (so a notification is never written for a state change that
 * rolled back).
 *
 * `collapse` (for chatter-y types like NEW_MESSAGE): if an unread notification
 * of the same type already exists for this (user, match), refresh it in place
 * instead of stacking a new row. This keeps the badge at "1 unread chat", not
 * "1 per message".
 */
export async function notify(
  opts: {
    userId: string;
    type: NotificationType;
    body: string;
    matchId?: string;
    collapse?: boolean;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (opts.collapse && opts.matchId) {
    const existing = await client.notification.findFirst({
      where: { userId: opts.userId, type: opts.type, matchId: opts.matchId, readAt: null },
      select: { id: true },
    });
    if (existing) {
      await client.notification.update({
        where: { id: existing.id },
        data: { body: opts.body },
      });
      return;
    }
  }

  await client.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      body: opts.body,
      matchId: opts.matchId ?? null,
    },
  });
}

/** Count of unread notifications for the nav badge. */
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
