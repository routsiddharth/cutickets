-- Admin access is now controlled exclusively by the two-email allowlist in
-- src/lib/admin.ts. Remove the obsolete database role and invite system.
DROP TABLE IF EXISTS "AdminInvite";

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
