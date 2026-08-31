import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  getEventStats,
  getListingsForEvent,
  getRecentSalesForEvent,
  recordEventViewAndGetWeeklyCount,
} from "@/lib/queries";
import { formatEventCardDate, formatPrice, relativeDayLabel } from "@/lib/format";
import { flyerUrl } from "@/lib/flyer";
import { hexToRgba } from "@/lib/color/hex";
import { DEFAULT_TINT } from "@/lib/tintPresets";
import AdBanner from "@/components/AdBanner";
import CancelListingButton from "@/components/CancelListingButton";
import ReserveListingForm from "@/components/ReserveListingForm";
import HeroReserveButton from "@/components/HeroReserveButton";
import NotifyMeButton from "@/components/NotifyMeButton";

// Elements inside the hero are tinted per-event (poster shadow, badge
// outline) from the flyer's sampled accent; a black-and-white flyer has no
// accent, so this falls back to the fixed ink tone rather than going colorless.
const FALLBACK_ACCENT = "#17293F";

type OpenRow = { id: string; priceCents: number; quantity: number; mine: boolean; dateLabel: string };
type SoldRow = { id: string; priceCents: number; quantity: number; dateLabel: string };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const [stats, listings, recentSales, weeklyViews, watch] = await Promise.all([
    getEventStats(id),
    getListingsForEvent(id),
    getRecentSalesForEvent(id),
    recordEventViewAndGetWeeklyCount(id),
    prisma.eventWatch.findUnique({
      where: { eventId_userId: { eventId: id, userId: user.id } },
      select: { id: true },
    }),
  ]);
  const flyer = flyerUrl(event.id, event.flyerUpdatedAt);

  const tintTop = event.tintTop ?? DEFAULT_TINT.tintTop;
  const tintMid = event.tintMid ?? DEFAULT_TINT.tintMid;
  const accent = event.tintAccent ?? FALLBACK_ACCENT;

  const hasAvailable = stats.lowestPriceCents !== null;

  // The hero's one-tap reserve always targets the cheapest listing that isn't the viewer's own.
  const heroTarget = listings.find((listing) => listing.sellerId !== user.id);

  const openRows: OpenRow[] = listings
    .map((listing) => ({
      id: listing.id,
      priceCents: listing.priceCents,
      quantity: listing.availableQuantity,
      mine: listing.sellerId === user.id,
      dateLabel: relativeDayLabel(listing.postedAt),
    }))
    .sort((a, b) => a.priceCents - b.priceCents);

  const soldRows: SoldRow[] = recentSales
    .filter((sale) => sale.completedAt)
    .map((sale) => ({
      id: sale.id,
      priceCents: sale.unitPriceCents,
      quantity: sale.quantity,
      dateLabel: relativeDayLabel(sale.completedAt!),
    }))
    .sort((a, b) => a.priceCents - b.priceCents);

  return (
    <main>
      {/* Bleeds up behind the sticky, translucent Nav (-mt cancels Nav's own
          height, matching pt keeps the content position unchanged) so the
          tint reads as one continuous field from the very top of the page,
          with no seam under the header. */}
      <div
        className="-mt-[124px] pt-[124px] sm:-mt-24 sm:pt-24"
        style={{ background: `linear-gradient(180deg, ${tintTop} 0%, ${tintMid} 78%, #FAF8F2 100%)` }}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-7 pt-8 pb-16 sm:pb-20">
          <Link href="/events" className="text-sm text-muted hover:text-ink">← Events</Link>

          <div className="mt-6 flex flex-col sm:flex-row gap-6 sm:gap-8">
            {flyer && (
              <div className="w-[200px] sm:w-[240px] shrink-0 mx-auto sm:mx-0">
                <div
                  className="relative aspect-[4/5] rounded-xl overflow-hidden border border-line"
                  style={{ boxShadow: `0 24px 48px -18px ${hexToRgba(accent, 0.25)}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flyer} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </div>
            )}

            <div className="min-w-0 flex-1">
              {/* Four hero lines, fixed ink ramp in order of emphasis: title darkest, then host, venue, date/time. */}
              <p className="font-mono text-xs tracking-wide uppercase text-muted">
                {formatEventCardDate(event.startsAt)}
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl leading-tight text-ink mt-1">{event.name}</h1>
              {event.host && <p className="text-base text-ink-secondary mt-2">{event.host}</p>}
              {(event.venue || event.poshLink) && (
                <p className="text-sm text-ink-tertiary mt-1.5">
                  {event.venue}
                  {event.venue && event.poshLink && " · "}
                  {event.poshLink && (
                    <a
                      href={event.poshLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-columbia hover:underline"
                    >
                      Event details ↗
                    </a>
                  )}
                </p>
              )}
              {event.description && (
                <p className="text-sm text-ink-secondary mt-3 max-w-xl leading-relaxed">{event.description}</p>
              )}

              {!event.archivedAt && (
                <div className="mt-6">
                  {(hasAvailable || stats.lastSaleCents !== null) && (
                    <>
                      <p className="text-sm text-muted">{hasAvailable ? "From" : "Last sold for"}</p>
                      <p className="font-serif text-6xl sm:text-7xl tabular-nums text-ink leading-none mt-1">
                        {formatPrice((hasAvailable ? stats.lowestPriceCents : stats.lastSaleCents)!)}
                      </p>
                    </>
                  )}

                  <div
                    className={`flex flex-wrap items-center gap-3 ${
                      hasAvailable || stats.lastSaleCents !== null ? "mt-6" : ""
                    }`}
                  >
                    {hasAvailable ? (
                      heroTarget && <HeroReserveButton listingId={heroTarget.id} priceCents={heroTarget.priceCents} />
                    ) : (
                      <NotifyMeButton eventId={id} initiallyWatching={!!watch} />
                    )}
                    <Link
                      href={`/events/${id}/sell`}
                      className="border border-[rgba(23,41,63,0.28)] text-ink rounded-full px-5 py-3 text-sm font-medium hover:bg-ink/5"
                    >
                      Sell tickets
                    </Link>
                  </div>

                  <p className="text-xs text-muted mt-4">
                    {weeklyViews} view{weeklyViews === 1 ? "" : "s"} in the past week
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
        {event.archivedAt ? (
          <p className="py-6 text-sm text-muted">This event is archived. New reservations are closed.</p>
        ) : openRows.length === 0 && soldRows.length === 0 ? (
          <section className="py-12 text-center">
            <h2 className="font-serif text-2xl">No tickets listed yet</h2>
            <p className="text-sm text-muted mt-1 mb-5">Have one to sell? Add the first listing.</p>
            <Link href={`/events/${id}/sell`} className="inline-block bg-sell text-white rounded-lg px-4 py-2.5 text-sm font-medium">
              Sell tickets
            </Link>
          </section>
        ) : (
          <>
            {openRows.length > 0 && (
              <section>
                <p className="text-xs text-muted text-right mb-3">Sorted by price</p>
                <div className="space-y-3">
                  {openRows.map((row) => (
                    <article
                      key={row.id}
                      className="bg-card border border-[rgba(23,41,63,0.12)] rounded-xl grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4"
                    >
                      <p className="font-serif text-2xl tabular-nums text-ink">{formatPrice(row.priceCents)}</p>
                      <div className="min-w-0">
                        <p className="text-sm text-ink-secondary">
                          {row.quantity} ticket{row.quantity === 1 ? "" : "s"}
                          {row.mine ? " · your listing" : ""}
                        </p>
                        <p className="text-xs text-muted mt-0.5">Posted {row.dateLabel}</p>
                      </div>
                      <div className="pl-4 border-l border-dashed border-[rgba(23,41,63,0.2)]">
                        {row.mine ? (
                          <CancelListingButton listingId={row.id} />
                        ) : (
                          <ReserveListingForm listingId={row.id} available={row.quantity} priceCents={row.priceCents} />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {soldRows.length > 0 && (
              <section className={openRows.length > 0 ? "mt-8" : ""}>
                {openRows.length > 0 && <div className="barcode-rule rounded-full overflow-hidden mb-8" />}
                <p className="text-xs text-muted text-right mb-3">Sold</p>
                <div className="space-y-3">
                  {soldRows.map((row) => (
                    <article
                      key={row.id}
                      className="bg-card border border-[rgba(23,41,63,0.12)] rounded-xl grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4"
                    >
                      <p className="font-serif text-2xl tabular-nums text-ink">{formatPrice(row.priceCents)}</p>
                      <div className="min-w-0">
                        <p className="text-sm text-ink-secondary">{row.quantity} ticket{row.quantity === 1 ? "" : "s"}</p>
                        <p className="text-xs text-muted mt-0.5">Sold {row.dateLabel}</p>
                      </div>
                      <div className="pl-4 border-l border-dashed border-[rgba(23,41,63,0.2)]">
                        <span className="tag text-muted">GONE</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-7">
        <AdBanner placement="EVENT_PAGE" />
      </div>
    </main>
  );
}
