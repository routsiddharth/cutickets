// App-level enums. Status/type fields are stored as plain strings (validated
// here) rather than native Postgres enums, to keep migrations cheap.

export const LISTING_STATUSES = ["OPEN", "SOLD_OUT", "CANCELLED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const DEAL_STATUSES = ["RESERVED", "COMPLETED", "CANCELLED", "EXPIRED"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

// How long a buyer holds tickets while arranging payment and transfer.
export const RESERVATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
// Nudge both parties once a reservation has under this long left.
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

// Rate-limiting: how many active listings an account may hold.
export const NEW_ACCOUNT_AGE_DAYS = 3;
export const NEW_ACCOUNT_ACTIVE_LISTING_CAP = 5;
export const ESTABLISHED_ACTIVE_LISTING_CAP = 25;

// Ad placement slots.
export const AD_PLACEMENTS = ["EVENTS_LIST", "EVENT_PAGE"] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

// Listing bounds (sanity limits to prevent abuse / overflow).
export const MAX_TICKETS_PER_LISTING = 12;
export const MAX_PRICE_CENTS = 100_000_00; // $100,000 absolute ceiling
export const MAX_NOTES_LENGTH = 500;
