-- AlterTable: admin verification fields on Event
ALTER TABLE "Event" ADD COLUMN "verified"     BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "verifiedAt"   TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN "verifiedById" TEXT;

ALTER TABLE "Event" ADD CONSTRAINT "Event_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
