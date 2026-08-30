import type { User } from "@prisma/client";

export const ADMIN_EMAILS = ["sd4012@columbia.edu", "sr4370@columbia.edu"] as const;

export function isAdmin(user: Pick<User, "email">): boolean {
  return !!user.email && (ADMIN_EMAILS as readonly string[]).includes(user.email.toLowerCase());
}
