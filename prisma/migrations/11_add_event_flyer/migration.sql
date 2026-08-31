-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "flyerUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EventFlyer" (
    "eventId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFlyer_pkey" PRIMARY KEY ("eventId")
);

-- AddForeignKey
ALTER TABLE "EventFlyer" ADD CONSTRAINT "EventFlyer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
