// App-level enums (SQLite has no native enum support).

export const LISTING_TYPES = ["SELL", "BUY"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = [
  "ACTIVE",
  "MATCHED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const MATCH_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

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

// Rate-limiting: how many ACTIVE listings a brand-new account may hold.
export const NEW_ACCOUNT_AGE_DAYS = 3;
export const NEW_ACCOUNT_ACTIVE_LISTING_CAP = 5;
export const ESTABLISHED_ACTIVE_LISTING_CAP = 25;

// Listing bounds (sanity limits to prevent abuse / overflow).
export const MAX_TICKETS_PER_LISTING = 12;
export const MAX_PRICE_CENTS = 100_000_00; // $100,000 absolute ceiling
export const MAX_NOTES_LENGTH = 500;
