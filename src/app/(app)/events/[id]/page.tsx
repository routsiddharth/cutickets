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
import HeroReserveButton from "@/components/HeroReserveButton";
import NotifyMeButton from "@/components/NotifyMeButton";
import TicketListingsSection, { type OpenRow, type SoldRow } from "@/components/TicketListingsSection";

// Elements inside the hero are tinted per-event (poster shadow, badge
// outline) from the flyer's sampled accent; a black-and-white flyer has no
// accent, so this falls back to the fixed ink tone rather than going colorless.
const FALLBACK_ACCENT = "#17293F";

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
      postedAtMs: listing.postedAt.getTime(),
    }))
    .sort((a, b) => a.priceCents - b.priceCents);

  const soldRows: SoldRow[] = recentSales
    .filter((sale) => sale.completedAt)
    .map((sale) => ({
      id: sale.id,
      priceCents: sale.unitPriceCents,
      quantity: sale.quantity,
      dateLabel: relativeDayLabel(sale.completedAt!),
      completedAtMs: sale.completedAt!.getTime(),
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
        <div className="max-w-4xl mx-auto px-5 sm:px-7 pt-8 pb-16 sm:pb-20">
          <Link href="/events" className="text-sm text-muted hover:text-ink">← Events</Link>

          <div className="mt-6 flex flex-col sm:flex-row gap-6 sm:gap-8">
            {flyer && (
              <div className="w-[300px] sm:w-[360px] shrink-0 mx-auto sm:mx-0">
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
              <h1 className="font-serif text-4xl sm:text-5xl leading-tight text-ink mt-2">{event.name}</h1>
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
                <div className="mt-8">
                  {(hasAvailable || stats.lastSaleCents !== null) && (
                    <>
                      <p className="text-sm text-muted leading-none">{hasAvailable ? "From" : "Last sold for"}</p>
                      <p
                        className={`font-serif text-6xl sm:text-7xl tabular-nums text-ink leading-none ${
                          hasAvailable ? "mt-[14px]" : "mt-[18px]"
                        }`}
                      >
                        {formatPrice((hasAvailable ? stats.lowestPriceCents : stats.lastSaleCents)!)}
                      </p>
                    </>
                  )}

                  <div
                    className={`flex flex-wrap items-center gap-3 ${
                      hasAvailable || stats.lastSaleCents !== null ? "mt-8" : ""
                    }`}
                  >
                    {hasAvailable ? (
                      heroTarget ? (
                        <HeroReserveButton listingId={heroTarget.id} priceCents={heroTarget.priceCents} />
                      ) : (
                        <a
                          href="#listings"
                          className="bg-ink text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-ink/90"
                        >
                          Buy for {formatPrice(stats.lowestPriceCents!)}
                        </a>
                      )
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

                  <p className="text-xs text-muted mt-3">
                    {weeklyViews} view{weeklyViews === 1 ? "" : "s"} in the past week
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="listings" className="max-w-4xl mx-auto px-5 sm:px-7 py-8 scroll-mt-[124px] sm:scroll-mt-24">
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
          <TicketListingsSection openRows={openRows} soldRows={soldRows} />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-5 sm:px-7">
        <AdBanner placement="EVENT_PAGE" />
      </div>
    </main>
  );
}
