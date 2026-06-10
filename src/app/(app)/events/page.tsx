import Link from "next/link";
import { getEventsWithStats } from "@/lib/queries";
import { formatDate, formatPrice } from "@/lib/format";

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
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-serif text-3xl">Events</h1>
          <p className="text-sm text-muted mt-0.5">
            Every event is a mini-market. Pick one to see who&apos;s buying and
            selling.
          </p>
        </div>
        <Link
          href="/listings/new"
          className="bg-ink text-white text-sm px-4 py-2.5 rounded-lg font-medium shrink-0 hover:bg-ink/90"
        >
          + Post a listing
        </Link>
      </div>

      <form className="flex gap-2 mb-6" action="/events">
        <input
          name="q"
          defaultValue={query ?? ""}
          placeholder="Search events…"
          className="flex-1 bg-white border border-line rounded-lg px-3.5 py-2.5 text-sm"
        />
        <button className="bg-columbia text-white text-sm px-4 py-2.5 rounded-lg font-medium">
          Search
        </button>
        {query && (
          <Link
            href="/events"
            className="bg-white border border-line text-sm px-4 py-2.5 rounded-lg text-muted grid place-items-center"
          >
            Clear
          </Link>
        )}
      </form>

      {events.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center">
          <p className="font-serif text-xl mb-1">
            {query ? "No events match that search." : "No events yet."}
          </p>
          <p className="text-sm text-muted mb-5">
            Be the first to start a market for an event.
          </p>
          <Link
            href="/events/new"
            className="inline-block bg-ink text-white text-sm px-4 py-2.5 rounded-lg font-medium"
          >
            Add an event
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {events.map(({ event, stats }) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white border border-line rounded-xl p-4 flex items-center justify-between hover:border-columbia transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{event.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {formatDate(event.startsAt)}
                    {event.venue ? ` · ${event.venue}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:gap-5 text-right shrink-0 ml-4">
                  <div>
                    <p className="font-serif text-lg text-sell tabular-nums leading-none">
                      {stats.sellTickets}
                    </p>
                    <p className="tag text-muted">selling</p>
                  </div>
                  <div>
                    <p className="font-serif text-lg text-buy tabular-nums leading-none">
                      {stats.buyTickets}
                    </p>
                    <p className="tag text-muted">buying</p>
                  </div>
                  <div className="border-l border-line pl-4 sm:pl-5 hidden xs:block">
                    <p className="text-[11px] text-muted leading-none mb-1">
                      last sale
                    </p>
                    <p className="font-serif tabular-nums leading-none">
                      {stats.lastSaleCents !== null
                        ? formatPrice(stats.lastSaleCents)
                        : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/events/new"
              className="text-sm text-columbia-deep hover:underline"
            >
              Don&apos;t see your event? Add it →
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
