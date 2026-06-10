import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Returns the full DB user for the current session, or null. Use in server
 * components / actions. Never trust client-supplied ids — always derive the
 * acting user from the session.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.bannedAt) return null;
  return user;
}

/** Throws if not signed in. Returns the DB user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export function isOnboarded(user: Pick<User, "school" | "classYear">): boolean {
  return !!user.school && !!user.classYear;
}
