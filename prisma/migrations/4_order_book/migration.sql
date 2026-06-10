-- Rework the marketplace into a continuous-double-auction order book.
-- Pre-launch: there are no production rows to preserve, so we recreate Match
-- cleanly (two-order reservation/trade) and truncate the tables that referenced
-- the old match shape. Listing gains order-book columns.

-- ── Listing → order semantics ──────────────────────────────────────────────
ALTER TABLE "Listing" ADD COLUMN "remainingQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Backfill any pre-existing rows: remaining = original qty, posted = created.
UPDATE "Listing" SET "remainingQuantity" = "quantity", "postedAt" = "createdAt";
ALTER TABLE "Listing" ALTER COLUMN "remainingQuantity" DROP DEFAULT;
-- Status vocabulary: ACTIVE → OPEN, COMPLETED → FILLED.
ALTER TABLE "Listing" ALTER COLUMN "status" SET DEFAULT 'OPEN';
UPDATE "Listing" SET "status" = 'OPEN' WHERE "status" = 'ACTIVE';
UPDATE "Listing" SET "status" = 'FILLED' WHERE "status" = 'COMPLETED';

DROP INDEX "Listing_eventId_type_status_idx";
CREATE INDEX "Listing_eventId_type_status_priceCents_postedAt_idx" ON "Listing"("eventId", "type", "status", "priceCents", "postedAt");

-- ── Match → reservation/trade ──────────────────────────────────────────────
-- Drop dependent rows (pre-launch, all empty) then recreate Match. Dropping
-- Match CASCADE also drops the FK constraints pointing at it from Message,
-- Rating and Notification — we re-add them below.
TRUNCATE TABLE "Rating", "Message", "Notification" RESTART IDENTITY CASCADE;
DROP TABLE "Match" CASCADE;

CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "buyOrderId" TEXT NOT NULL,
    "sellOrderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reservedQuantity" INTEGER NOT NULL,
    "settlePriceCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "buyerAccepted" BOOLEAN NOT NULL DEFAULT false,
    "sellerAccepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3),
    "reservationExpiresAt" TIMESTAMP(3) NOT NULL,
    "expiringSoonNotifiedAt" TIMESTAMP(3),
    "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "sellerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "agreedPriceCents" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Match_buyerId_status_idx" ON "Match"("buyerId", "status");
CREATE INDEX "Match_sellerId_status_idx" ON "Match"("sellerId", "status");
CREATE INDEX "Match_eventId_status_idx" ON "Match"("eventId", "status");
CREATE INDEX "Match_status_reservationExpiresAt_idx" ON "Match"("status", "reservationExpiresAt");

ALTER TABLE "Match" ADD CONSTRAINT "Match_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-add the dependent-table FKs that DROP ... CASCADE removed.
ALTER TABLE "Message" ADD CONSTRAINT "Message_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ReservationExclusion ───────────────────────────────────────────────────
CREATE TABLE "ReservationExclusion" (
    "id" TEXT NOT NULL,
    "buyOrderId" TEXT NOT NULL,
    "sellOrderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationExclusion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationExclusion_buyOrderId_sellOrderId_key" ON "ReservationExclusion"("buyOrderId", "sellOrderId");
CREATE INDEX "ReservationExclusion_buyOrderId_idx" ON "ReservationExclusion"("buyOrderId");
CREATE INDEX "ReservationExclusion_sellOrderId_idx" ON "ReservationExclusion"("sellOrderId");

ALTER TABLE "ReservationExclusion" ADD CONSTRAINT "ReservationExclusion_buyOrderId_fkey" FOREIGN KEY ("buyOrderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReservationExclusion" ADD CONSTRAINT "ReservationExclusion_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
