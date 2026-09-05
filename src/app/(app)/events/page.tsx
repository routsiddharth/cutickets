import Link from "next/link";
import { getEventsWithStats } from "@/lib/queries";
import { flyerUrl } from "@/lib/flyer";
import AdBanner from "@/components/AdBanner";
import EventsGrid from "@/components/EventsGrid";

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
        <EventsGrid
          events={events.map(({ event, stats }) => ({
            event: {
              id: event.id,
              name: event.name,
              venue: event.venue,
              startsAt: event.startsAt,
              flyer: flyerUrl(event.id, event.flyerUpdatedAt),
            },
            stats,
          }))}
        />
      )}
    </main>
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
