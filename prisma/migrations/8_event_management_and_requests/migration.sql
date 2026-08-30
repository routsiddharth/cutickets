-- Event creation is admin-only, so the old second-stage verification state is
-- replaced by explicit archival and student event requests.
ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_verifiedById_fkey";

ALTER TABLE "Event"
  DROP COLUMN IF EXISTS "verified",
  DROP COLUMN IF EXISTS "verifiedAt",
  DROP COLUMN IF EXISTS "verifiedById",
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "Notification" ADD COLUMN "eventId" TEXT;

CREATE TABLE "EventRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "venue" TEXT,
  "startsAt" TIMESTAMP(3),
  "details" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "eventId" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventRequest" ADD CONSTRAINT "EventRequest_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Event_archivedAt_startsAt_idx" ON "Event"("archivedAt", "startsAt");
CREATE INDEX "EventRequest_status_createdAt_idx" ON "EventRequest"("status", "createdAt");
CREATE INDEX "EventRequest_requesterId_status_idx" ON "EventRequest"("requesterId", "status");
