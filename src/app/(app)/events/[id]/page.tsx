import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getEventStats, getEventMarket, type MarketListing } from "@/lib/queries";
import { formatDateTime, formatPrice } from "@/lib/format";
import ListingCard from "@/components/ListingCard";
import type { MatchStatus } from "@/lib/constants";

type MatchState = "NONE" | MatchStatus;

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const [stats, market, myMatches] = await Promise.all([
    getEventStats(id),
    getEventMarket(id),
    prisma.match.findMany({
      where: { interestedId: user.id, listing: { eventId: id } },
      select: { listingId: true, status: true },
    }),
  ]);

  const matchByListing = new Map<string, MatchStatus>(
    myMatches.map((m) => [m.listingId, m.status as MatchStatus]),
  );
  const stateFor = (l: MarketListing): MatchState =>
    matchByListing.get(l.id) ?? "NONE";

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/events" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>

      {/* Header / market summary */}
      <div className="bg-ink text-white rounded-2xl px-6 sm:px-8 py-7 mt-3">
        <p className="tag mb-2" style={{ color: "#9FC0DC" }}>
          {formatDateTime(event.startsAt)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl mb-4">{event.name}</h1>
        {event.description && (
          <p className="text-sm mb-4 max-w-2xl" style={{ color: "#B7C3D6" }}>
            {event.description}
          </p>
        )}
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
          <div>
            <span className="font-serif text-2xl tabular-nums text-sell-soft">
              {stats.sellTickets}
            </span>{" "}
            <span style={{ color: "#B7C3D6" }}>tickets for sale</span>
          </div>
          <div>
            <span className="font-serif text-2xl tabular-nums" style={{ color: "#E7C79B" }}>
              {stats.buyTickets}
            </span>{" "}
            <span style={{ color: "#B7C3D6" }}>wanted</span>
          </div>
          <div className="sm:border-l border-white/15 sm:pl-7">
            <span style={{ color: "#B7C3D6" }}>last confirmed sale </span>
            <span className="font-serif text-2xl tabular-nums">
              {stats.lastSaleCents !== null ? formatPrice(stats.lastSaleCents) : "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-muted">
          Asking prices are set by students and aren&apos;t verified — only{" "}
          <b className="text-ink">confirmed sales</b> reflect real trades.
        </p>
        <Link
          href={`/listings/new?eventId=${event.id}`}
          className="bg-ink text-white text-sm px-4 py-2.5 rounded-lg font-medium shrink-0 ml-4 hover:bg-ink/90"
        >
          + Post here
        </Link>
      </div>

      {/* The two-sided market */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Selling */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl text-sell flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sell" /> Selling
            </h2>
            <span className="tag text-muted">cheapest first</span>
          </div>
          {market.sell.length === 0 ? (
            <EmptyColumn text="No one is selling yet." eventId={event.id} />
          ) : (
            <div className="space-y-2.5">
              {market.sell.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  variant="sell"
                  isOwner={l.userId === user.id}
                  matchState={stateFor(l)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Buying */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl text-buy flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-buy" /> Buying
            </h2>
            <span className="tag text-muted">highest bid first</span>
          </div>
          {market.buy.length === 0 ? (
            <EmptyColumn text="No one is buying yet." eventId={event.id} />
          ) : (
            <div className="space-y-2.5">
              {market.buy.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  variant="buy"
                  isOwner={l.userId === user.id}
                  matchState={stateFor(l)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyColumn({ text, eventId }: { text: string; eventId: string }) {
  return (
    <div className="bg-white border border-dashed border-line rounded-xl p-8 text-center text-sm text-muted">
      {text}{" "}
      <Link href={`/listings/new?eventId=${eventId}`} className="text-columbia-deep hover:underline">
        Be the first.
      </Link>
    </div>
  );
}
