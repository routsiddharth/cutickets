-- The pre-launch market data is disposable. Keep users and events, and replace
-- the bid/ask engine with fixed-price seller listings and direct buyer deals.
TRUNCATE TABLE "Rating", "Message", "Notification", "ReservationExclusion", "Match", "Listing" CASCADE;

ALTER TABLE "Listing" DROP CONSTRAINT "Listing_userId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_buyOrderId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_buyerId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_eventId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_sellOrderId_fkey";
ALTER TABLE "Match" DROP CONSTRAINT "Match_sellerId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT "Message_matchId_fkey";
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_matchId_fkey";
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_matchId_fkey";
ALTER TABLE "ReservationExclusion" DROP CONSTRAINT "ReservationExclusion_buyOrderId_fkey";
ALTER TABLE "ReservationExclusion" DROP CONSTRAINT "ReservationExclusion_sellOrderId_fkey";

DROP INDEX "Listing_eventId_type_status_priceCents_postedAt_idx";
DROP INDEX "Listing_userId_idx";
DROP INDEX "Message_matchId_createdAt_idx";
DROP INDEX "Rating_matchId_authorId_key";

ALTER TABLE "Event" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Listing"
  DROP COLUMN "remainingQuantity",
  DROP COLUMN "type",
  DROP COLUMN "userId",
  ADD COLUMN "availableQuantity" INTEGER NOT NULL,
  ADD COLUMN "sellerId" TEXT NOT NULL;
ALTER TABLE "Message" DROP COLUMN "matchId", ADD COLUMN "dealId" TEXT NOT NULL;
ALTER TABLE "Notification" DROP COLUMN "matchId", ADD COLUMN "dealId" TEXT;
ALTER TABLE "Rating" DROP COLUMN "matchId", ADD COLUMN "dealId" TEXT NOT NULL;

DROP TABLE "Match";
DROP TABLE "ReservationExclusion";

CREATE TABLE "Deal" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "reservationExpiresAt" TIMESTAMP(3) NOT NULL,
  "expiringSoonNotifiedAt" TIMESTAMP(3),
  "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "sellerConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deal_buyerId_status_idx" ON "Deal"("buyerId", "status");
CREATE INDEX "Deal_sellerId_status_idx" ON "Deal"("sellerId", "status");
CREATE INDEX "Deal_eventId_status_idx" ON "Deal"("eventId", "status");
CREATE INDEX "Deal_listingId_status_idx" ON "Deal"("listingId", "status");
CREATE INDEX "Deal_status_reservationExpiresAt_idx" ON "Deal"("status", "reservationExpiresAt");
CREATE INDEX "Listing_eventId_status_priceCents_postedAt_idx" ON "Listing"("eventId", "status", "priceCents", "postedAt");
CREATE INDEX "Listing_sellerId_idx" ON "Listing"("sellerId");
CREATE INDEX "Message_dealId_createdAt_idx" ON "Message"("dealId", "createdAt");
CREATE UNIQUE INDEX "Rating_dealId_authorId_key" ON "Rating"("dealId", "authorId");

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
