import type { User } from "@prisma/client";

export const SUPERADMIN_EMAILS = ["sd4012@columbia.edu", "sr4370@columbia.edu"] as const;

export function isSuperAdmin(user: Pick<User, "email">): boolean {
  return !!user.email && (SUPERADMIN_EMAILS as readonly string[]).includes(user.email);
}

export function isAdmin(user: Pick<User, "email" | "role">): boolean {
  return isSuperAdmin(user) || user.role === "ADMIN";
}
