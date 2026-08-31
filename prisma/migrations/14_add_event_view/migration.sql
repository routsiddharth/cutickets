-- CreateTable
CREATE TABLE "EventView" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventView_eventId_viewedAt_idx" ON "EventView"("eventId", "viewedAt");

-- AddForeignKey
ALTER TABLE "EventView" ADD CONSTRAINT "EventView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
