// Display helpers. Money is stored as integer cents everywhere.

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  // Show whole dollars without decimals, otherwise two decimals.
  return Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dollarsToCents(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "TBD";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "TBD";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeExpiry(expiresAt: Date | string): string {
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "expires soon";
  if (hours < 24) return `expires in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `expires in ${days}d`;
}

export function initials(name: string | null | undefined, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** A privacy-preserving public display name: first name + last initial. */
export function publicName(name: string | null | undefined, email?: string | null): string {
  const source = (name || email?.split("@")[0] || "Student").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return parts[0] ?? "Student";
}

export function schoolAbbrev(school: string | null | undefined, classYear: number | null | undefined): string {
  if (!school) return "";
  const map: Record<string, string> = {
    "Columbia College": "CC",
    "Barnard College": "BC",
    "SEAS (Engineering)": "SEAS",
    "General Studies": "GS",
    "GSAS / Graduate": "GSAS",
    "Other Columbia school": "CU",
  };
  const abbr = map[school] ?? "CU";
  const yr = classYear ? ` '${String(classYear).slice(2)}` : "";
  return `${abbr}${yr}`;
}
