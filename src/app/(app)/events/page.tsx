import Link from "next/link";
import { getEventsWithStats } from "@/lib/queries";
import { formatEventCardDate, formatPrice } from "@/lib/format";
import { flyerUrl } from "@/lib/flyer";
import AdBanner from "@/components/AdBanner";

type EventCardData = {
  id: string;
  name: string;
  venue: string | null;
  startsAt: Date | null;
  flyerUpdatedAt: Date | null;
};

type EventCardStats = {
  ticketsAvailable: number;
  lowestPriceCents: number | null;
  salesCount: number;
  lastSaleCents: number | null;
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || undefined;
  const events = await getEventsWithStats(query);

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <div className="mb-5">
        <h1 className="font-serif text-3xl">Events</h1>
        <p className="text-sm text-muted mt-0.5">
          Browse tickets from verified Columbia and Barnard students.
        </p>
      </div>

      <form className="flex gap-2 mb-6" action="/events">
        <input
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search events…"
          className="flex-1 bg-card border border-line rounded-full px-4 py-2.5 text-sm"
        />
        <button className="bg-columbia text-white text-sm px-5 py-2.5 rounded-full font-medium">
          Search
        </button>
        {query && (
          <Link
            href="/events"
            className="bg-card border border-line text-sm px-4 py-2.5 rounded-full text-muted grid place-items-center"
          >
            Clear
          </Link>
        )}
      </form>

      <AdBanner placement="EVENTS_LIST" />

      {events.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(({ event, stats }) => (
            <EventCard key={event.id} event={event} stats={stats} />
          ))}
          <RequestEventTile />
        </div>
      )}
    </main>
  );
}

function EventCard({ event, stats }: { event: EventCardData; stats: EventCardStats }) {
  const hasAvailable = stats.lowestPriceCents !== null;
  const scarce = hasAvailable && stats.ticketsAvailable <= 2;
  const soldLine =
    stats.salesCount > 0 && stats.lastSaleCents !== null
      ? `${stats.salesCount} sold · last at ${formatPrice(stats.lastSaleCents)}`
      : "No sales yet";
  const flyer = flyerUrl(event.id, event.flyerUpdatedAt);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-card rounded-2xl overflow-hidden shadow-[inset_0_0_0_1px_#e7e2d8,0_1px_0_rgba(20,35,61,0.06)] hover:shadow-[inset_0_0_0_1px_#5b8fb9,0_1px_0_rgba(20,35,61,0.06)] transition-shadow"
    >
      <div className={`relative aspect-[4/5] ${flyer ? "bg-ink/5" : "flyer-placeholder"}`}>
        {flyer ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flyer}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="tag absolute inset-0 grid place-items-center text-ink/20">Flyer</span>
        )}
        {hasAvailable && (
          <span
            className={`tag font-mono absolute top-3 left-3 px-2.5 py-1 rounded-full ${
              scarce ? "foil text-white" : "bg-sell-soft text-sell"
            }`}
          >
            {scarce ? `${stats.ticketsAvailable} left` : `${stats.ticketsAvailable} available`}
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="font-mono text-[11px] tracking-wide text-muted">
          {formatEventCardDate(event.startsAt)}
        </p>
        <p className="font-serif text-xl mt-1 truncate">{event.name}</p>
        {event.venue && <p className="text-xs text-muted mt-0.5 truncate">{event.venue}</p>}

        <div className="tear -mx-4 my-3" />

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {hasAvailable ? (
              <p className="font-serif text-2xl leading-none tabular-nums">
                {formatPrice(stats.lowestPriceCents!)}
              </p>
            ) : (
              <p className="font-serif text-xl leading-none text-muted">None right now</p>
            )}
            <p className="font-mono text-[11px] text-muted mt-1.5 truncate">{soldLine}</p>
          </div>
          <span
            className={`shrink-0 text-xs font-medium px-3.5 py-2 rounded-lg ${
              hasAvailable ? "bg-ink text-white" : "border border-line text-muted"
            }`}
          >
            {hasAvailable ? "Reserve" : "Notify me"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RequestEventTile() {
  return (
    <Link
      href="/events/request"
      className="group relative h-full flex flex-col items-center justify-center gap-2 rounded-2xl overflow-hidden border-2 border-dashed border-line text-muted hover:border-columbia hover:text-columbia-deep transition-colors p-6 text-center"
    >
      <span className="notch-sides" aria-hidden="true" />
      <span className="w-9 h-9 rounded-full border border-current grid place-items-center text-lg leading-none">
        +
      </span>
      <span className="text-sm font-medium">Request an event</span>
    </Link>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-10 text-center">
      <p className="font-serif text-xl mb-1">
        {query ? "No events match that search." : "No events yet."}
      </p>
      <p className="text-sm text-muted mb-5">
        {query
          ? "Request it and an admin will review it."
          : "Morningside Tickets admins add events as they’re announced."}
      </p>
      <Link
        href={`/events/request${query ? `?name=${encodeURIComponent(query)}` : ""}`}
        className="inline-block bg-ink text-white text-sm px-4 py-2.5 rounded-lg font-medium"
      >
        Request an event
      </Link>
    </div>
  );
}
