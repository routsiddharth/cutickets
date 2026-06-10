// App-level enums. Status/type fields are stored as plain strings (validated
// here) rather than native Postgres enums, to keep migrations cheap.

export const LISTING_TYPES = ["SELL", "BUY"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

// An order's lifecycle. OPEN = live on the book (remainingQuantity may be < the
// original quantity if partially reserved); FILLED = fully traded; CANCELLED =
// the lister withdrew the live remainder. EXPIRED is computed at read time
// (expiresAt < now) rather than stored, so it is intentionally absent here.
export const ORDER_STATUSES = ["OPEN", "FILLED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
// Kept as an alias so existing imports keep working.
export const LISTING_STATUSES = ORDER_STATUSES;
export type ListingStatus = OrderStatus;

// A reservation/trade lifecycle. RESERVED → ACCEPTED → COMPLETED is the happy
// path; DECLINED/EXPIRED free the tickets back to the book; CANCELLED is a
// back-out from an accepted-but-not-completed deal.
export const MATCH_STATUSES = [
  "RESERVED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

// How long both parties have to accept a reservation before it expires and the
// tickets roll to the next counterparty in the queue.
export const RESERVATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
// Nudge the party who hasn't accepted yet once a reservation has under this long
// left on its window.
export const RESERVATION_EXPIRING_SOON_MS = 4 * 60 * 60 * 1000; // 4 hours

// Schools shown in onboarding. Stored as free-ish strings but constrained here.
export const SCHOOLS = [
  "Columbia College",
  "Barnard College",
  "SEAS (Engineering)",
  "General Studies",
  "GSAS / Graduate",
  "Other Columbia school",
] as const;
export type School = (typeof SCHOOLS)[number];

export const REPORT_REASONS = [
  "Scam / fraud",
  "Price gouging",
  "Fake listing",
  "Harassment",
  "Not a real student",
  "Other",
] as const;

// Rate-limiting: how many OPEN orders a brand-new account may hold.
export const NEW_ACCOUNT_AGE_DAYS = 3;
export const NEW_ACCOUNT_ACTIVE_LISTING_CAP = 5;
export const ESTABLISHED_ACTIVE_LISTING_CAP = 25;

// Listing bounds (sanity limits to prevent abuse / overflow).
export const MAX_TICKETS_PER_LISTING = 12;
export const MAX_PRICE_CENTS = 100_000_00; // $100,000 absolute ceiling
export const MAX_NOTES_LENGTH = 500;
