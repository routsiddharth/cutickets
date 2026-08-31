-- CreateTable
CREATE TABLE "EventWatch" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventWatch_eventId_idx" ON "EventWatch"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventWatch_eventId_userId_key" ON "EventWatch"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "EventWatch" ADD CONSTRAINT "EventWatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventWatch" ADD CONSTRAINT "EventWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
