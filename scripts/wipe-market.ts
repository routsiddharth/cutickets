// One-off cleanup: delete every Event, cascading to Listings, Matches,
// Messages, Ratings, Notifications (matchId-linked), and ReservationExclusions.
// Users, accounts, ads, and admin invites are left untouched.
//
// Usage:
//   POSTGRES_PRISMA_URL=… POSTGRES_URL_NON_POOLING=… npx tsx scripts/wipe-market.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [eventCount, listingCount] = await Promise.all([
    prisma.event.count(),
    prisma.listing.count(),
  ]);
  console.log(`About to delete ${eventCount} event(s) and ${listingCount} listing(s) (cascades matches/messages/ratings).`);

  const { count } = await prisma.event.deleteMany({});
  console.log(`Deleted ${count} event(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
