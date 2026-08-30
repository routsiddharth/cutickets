import type { User } from "@prisma/client";

/**
 * The public shape of a student: everything safe to show to anyone, and — by
 * construction — NOT their email. A listing owner's email is PII that is only
 * revealed only inside a deal between the buyer and seller.
 *
 * Centralizing this select makes "don't leak email in the market/profile views"
 * a property of the type system rather than a thing each query must remember:
 * a `PublicUser` simply has no `email` field to render.
 */
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  image: true,
  school: true,
  classYear: true,
  createdAt: true,
} as const;

export type PublicUser = Pick<
  User,
  "id" | "name" | "image" | "school" | "classYear" | "createdAt"
>;
