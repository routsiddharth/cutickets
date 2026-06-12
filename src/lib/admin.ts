export const ADMIN_EMAILS = ["sd4012@columbia.edu", "sr4370@columbia.edu"] as const;

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && (ADMIN_EMAILS as readonly string[]).includes(email);
}
