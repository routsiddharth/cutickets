// This marketplace only serves Columbia/Barnard students on one campus, so
// every date we parse from a form or format for display is anchored to NYC
// wall-clock time — never the Vercel function's runtime TZ (UTC) or a
// traveling browser's local TZ.
export const NYC_TZ = "America/New_York";

/**
 * Interprets a naive "YYYY-MM-DDTHH:mm[:ss]" string (no offset) as wall-clock
 * time in `timeZone` and returns the corresponding instant, correctly
 * accounting for DST. Returns null if `naive` doesn't match the expected shape.
 */
export function zonedTimeToUtc(naive: string, timeZone: string = NYC_TZ): Date | null {
  const match = naive.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const guess = Date.UTC(+year, +month - 1, +day, +hour, +minute, +(second ?? "0"));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(guess))
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  // What our UTC guess reads as, wall-clock, in `timeZone` — reinterpreted as
  // if it were UTC. The gap between that and the guess is the zone's offset.
  const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(guess - (asIfUtc - guess));
}

/** The "YYYY-MM-DD" calendar-day key for `date` as observed in `timeZone`. */
export function zonedDayKey(date: Date, timeZone: string = NYC_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Midnight at the start of `date`'s calendar day in `timeZone`, as an instant. */
export function startOfZonedDay(date: Date, timeZone: string = NYC_TZ): Date {
  return zonedTimeToUtc(`${zonedDayKey(date, timeZone)}T00:00:00`, timeZone)!;
}
