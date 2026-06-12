-- AlterTable: role-based access control on User
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable: admin invite allowlist (no FK on createdBy — avoids cascade complexity)
CREATE TABLE "AdminInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable: superadmin-managed ad units
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "body" TEXT,
    "placement" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvite_email_key" ON "AdminInvite"("email");

-- CreateIndex
CREATE INDEX "Ad_placement_active_idx" ON "Ad"("placement", "active");
