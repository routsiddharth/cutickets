// Allowed-domain enforcement. Single source of truth for "who is a verified
// student" — used by the auth signIn callback and the dev-login provider.

function parseDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "columbia.edu,barnard.edu")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export const ALLOWED_EMAIL_DOMAINS = parseDomains();

/**
 * True only when `email` is a syntactically plausible address whose domain is
 * exactly one of the allowed domains. We match on the substring after the LAST
 * "@" and require an exact domain equality (not endsWith) so that
 * "evil-columbia.edu" or "columbia.edu.attacker.com" are rejected.
 */
export function isAllowedEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return false;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.includes("@") || domain.includes("@")) return false;
  // domain must be a plausible hostname
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

export function allowedDomainsLabel(): string {
  return ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(" and ");
}
