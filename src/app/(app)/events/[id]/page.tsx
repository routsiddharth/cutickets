import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getEventStats, getListingsForEvent, getSalesCount } from "@/lib/queries";
import { formatDateTime, formatPrice, publicName, schoolAbbrev } from "@/lib/format";
import Avatar from "@/components/Avatar";
import AdBanner from "@/components/AdBanner";
import CancelListingButton from "@/components/CancelListingButton";
import ReserveListingForm from "@/components/ReserveListingForm";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const [stats, salesCount, listings] = await Promise.all([
    getEventStats(id),
    getSalesCount(id),
    getListingsForEvent(id),
  ]);

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/events" className="text-sm text-muted hover:text-ink">← Events</Link>

      <header className="mt-5 pb-6 border-b border-line">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl leading-tight">{event.name}</h1>
            <p className="text-sm text-muted mt-1.5">{formatDateTime(event.startsAt)}{event.venue ? ` · ${event.venue}` : ""}</p>
          </div>
          {!event.archivedAt && (
            <Link href={`/events/${id}/sell`} className="self-start shrink-0 bg-sell text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-sell/90">Sell tickets</Link>
          )}
        </div>
        {event.description && <p className="text-sm text-muted mt-4 max-w-2xl leading-relaxed">{event.description}</p>}
        {event.poshLink && <a href={event.poshLink} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-columbia-deep mt-3 hover:underline">Event details ↗</a>}

        <dl className="flex gap-8 mt-5 text-sm">
          <div>
            <dt className="text-muted">Available</dt>
            <dd className="text-xl font-medium tabular-nums">{stats.ticketsAvailable} ticket{stats.ticketsAvailable === 1 ? "" : "s"}</dd>
          </div>
          <div>
            <dt className="text-muted">Starting at</dt>
            <dd className="text-xl font-medium tabular-nums">{stats.lowestPriceCents === null ? "—" : formatPrice(stats.lowestPriceCents)}</dd>
          </div>
          <div className="hidden sm:block">
            <dt className="text-muted">Last sold</dt>
            <dd className="text-xl font-medium tabular-nums">{stats.lastSaleCents === null ? "—" : formatPrice(stats.lastSaleCents)}{salesCount > 0 && <span className="text-xs text-muted font-normal ml-1">· {salesCount}</span>}</dd>
          </div>
        </dl>
      </header>

      {event.archivedAt ? (
        <p className="py-10 text-sm text-muted">This event is archived. New reservations are closed.</p>
      ) : listings.length === 0 ? (
        <section className="py-12 text-center border-b border-line">
          <h2 className="font-serif text-2xl">No tickets listed yet</h2>
          <p className="text-sm text-muted mt-1 mb-5">Have one to sell? Add the first listing.</p>
          <Link href={`/events/${id}/sell`} className="inline-block bg-sell text-white rounded-lg px-4 py-2.5 text-sm font-medium">Sell tickets</Link>
        </section>
      ) : (
        <section className="py-6">
          <h2 className="font-serif text-2xl mb-4">Tickets for sale</h2>
          <div className="divide-y divide-line border-y border-line">
            {listings.map((listing) => {
              const mine = listing.sellerId === user.id;
              const sellerName = publicName(listing.seller.name, "student@columbia.edu");
              return (
                <article key={listing.id} className="py-4 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={listing.seller.name} email="" image={listing.seller.image} size={42} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <Link href={`/profile/${listing.sellerId}`} className="font-medium hover:underline">{sellerName}</Link>
                        {mine && <span className="text-xs text-muted">Your listing</span>}
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {schoolAbbrev(listing.seller.school, listing.seller.classYear)}
                        {listing.reputation.ratingAvg !== null ? ` · ★ ${listing.reputation.ratingAvg.toFixed(1)}` : ""}
                        {` · ${listing.reputation.tradesCompleted} trade${listing.reputation.tradesCompleted === 1 ? "" : "s"}`}
                      </p>
                      <p className="text-sm mt-1"><span className="font-medium tabular-nums">{formatPrice(listing.priceCents)}</span> each · {listing.availableQuantity} available</p>
                    </div>
                  </div>
                  {mine ? <CancelListingButton listingId={listing.id} /> : <div className="pl-[54px] sm:pl-0"><ReserveListingForm listingId={listing.id} available={listing.availableQuantity} priceCents={listing.priceCents} /></div>}
                </article>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-4">Reserving opens a private chat and holds the tickets for 24 hours.</p>
        </section>
      )}

      <AdBanner placement="EVENT_PAGE" />
    </main>
  );
}
