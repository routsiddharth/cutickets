import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { purchasableListingWhere } from "@/lib/listing";

export type NotificationType =
  | "DEAL_STARTED"
  | "DEAL_CANCELLED"
  | "RESERVATION_EXPIRING"
  | "NEW_MESSAGE"
  | "TRADE_CONFIRMED"
  | "TRADE_COMPLETED"
  | "EVENT_REQUEST_FULFILLED" //     a requested event is now live
  | "EVENT_REQUEST_DISMISSED" //     an event request was declined
  | "EVENT_ARCHIVED" //              an event and its open orders were archived
  | "LISTING_KILLED" //              a moderator removed your listing
  | "TRADE_ADMIN_CANCELLED" //       a moderator cancelled your active deal
  | "EVENT_TICKETS_AVAILABLE"; //    a ticket was listed for an event you asked to be notified about

/**
 * Create an in-app notification. Pass a `tx` to enlist it in a surrounding
 * transaction (so a notification is never written for a state change that
 * rolled back).
 *
 * `collapse` (for chatter-y types like NEW_MESSAGE): if an unread notification
 * of the same type already exists for this (user, deal), refresh it in place
 * instead of stacking a new row. This keeps the badge at "1 unread chat", not
 * "1 per message".
 */
export async function notify(
  opts: {
    userId: string;
    type: NotificationType;
    body: string;
    dealId?: string;
    eventId?: string;
    collapse?: boolean;
  },
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (opts.collapse && opts.dealId) {
    const existing = await client.notification.findFirst({
      where: { userId: opts.userId, type: opts.type, dealId: opts.dealId, readAt: null },
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
      dealId: opts.dealId ?? null,
      eventId: opts.eventId ?? null,
    },
  });
}

/** Count of unread notifications for the nav badge. */
export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/**
 * Call after any change that might have put an event back in stock — a new
 * listing, or a cancelled/expired reservation restoring quantity. Checks
 * real purchasable inventory itself (rather than trusting the caller), so
 * it's safe to call speculatively. Fires "Notify me" for every watcher and
 * clears the list; a later sell-out needs a fresh tap.
 */
export async function notifyEventWatchersIfAvailable(
  eventId: string,
  eventName: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const available = await client.listing.findFirst({
    where: { eventId, ...purchasableListingWhere() },
    select: { id: true },
  });
  if (!available) return;

  const watchers = await client.eventWatch.findMany({ where: { eventId }, select: { userId: true } });
  if (watchers.length === 0) return;

  await Promise.all(
    watchers.map((watcher) =>
      notify(
        {
          userId: watcher.userId,
          type: "EVENT_TICKETS_AVAILABLE",
          body: `A ticket is available for “${eventName}.”`,
          eventId,
        },
        client,
      ),
    ),
  );
  await client.eventWatch.deleteMany({ where: { eventId } });
}
