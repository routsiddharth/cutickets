import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Archives an event, cancels any still-open listings, and notifies affected sellers. */
export async function archiveEventCore(
  client: DbClient,
  event: { id: string; name: string; listings: { sellerId: string }[] },
): Promise<void> {
  await client.event.update({ where: { id: event.id }, data: { archivedAt: new Date() } });
  await client.listing.updateMany({
    where: { eventId: event.id, status: "OPEN" },
    data: { status: "CANCELLED", availableQuantity: 0 },
  });
  const affectedUsers = [...new Set(event.listings.map((listing) => listing.sellerId))];
  await Promise.all(
    affectedUsers.map((userId) =>
      notify(
        {
          userId,
          type: "EVENT_ARCHIVED",
          body: `“${event.name}” was archived, so your open order was cancelled.`,
          eventId: event.id,
        },
        client,
      ),
    ),
  );
}
