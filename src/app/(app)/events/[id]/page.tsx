import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getEventStats, getMyOrdersForEvent, getSalesCount } from "@/lib/queries";
import { formatDateTime, formatPrice } from "@/lib/format";
import CancelListingButton from "@/components/CancelListingButton";
import AdBanner from "@/components/AdBanner";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  const [stats, salesCount, myOrders, myMatches] = await Promise.all([
    getEventStats(id),
    getSalesCount(id),
    getMyOrdersForEvent(id, user.id),
    prisma.match.findMany({
      where: {
        eventId: id,
        status: { in: ["RESERVED", "ACCEPTED"] },
        OR: [{ buyerId: user.id }, { sellerId: user.id }],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        status: true,
        buyerId: true,
        reservedQuantity: true,
        settlePriceCents: true,
      },
    }),
  ]);

  const buyNow = stats.bestAskCents;
  const sellNow = stats.bestBidCents;

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/events" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>

      {/* Hero / price anchor */}
      <div className="bg-ink text-white rounded-2xl px-6 sm:px-8 py-7 mt-3">
        <p className="tag mb-2" style={{ color: "#9FC0DC" }}>
          {formatDateTime(event.startsAt)}
          {event.venue ? ` · ${event.venue}` : ""}
        </p>
        <div className="flex items-start gap-2.5 flex-wrap mb-4">
          <h1 className="font-serif text-3xl sm:text-4xl">{event.name}</h1>
        </div>
        {event.description && (
          <p className="text-sm mb-4 max-w-2xl" style={{ color: "#B7C3D6" }}>
            {event.description}
          </p>
        )}
        {event.poshLink && (
          <a
            href={event.poshLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium mb-4 hover:underline"
            style={{ color: "#9FC0DC" }}
          >
            Event page ↗
          </a>
        )}
        {stats.lastSaleCents !== null ? (
          // The honest anchor: a price a real student actually paid (StockX-style
          // "last sale"), never an invented midpoint.
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl tabular-nums">
              {formatPrice(stats.lastSaleCents)}
            </span>
            <span className="text-sm" style={{ color: "#B7C3D6" }}>
              last sold here{salesCount > 1 ? ` · ${salesCount} sold` : ""}
            </span>
          </div>
        ) : stats.bestAskCents !== null ? (
          // No sale yet, but tickets are listed — lead with the cheapest one
          // ("from $X"), the way ticket sites do. It's a real asking price.
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm" style={{ color: "#B7C3D6" }}>
                from
              </span>
              <span className="font-serif text-4xl tabular-nums">
                {formatPrice(stats.bestAskCents)}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "#B7C3D6" }}>
              no confirmed sales yet
            </p>
          </>
        ) : stats.bestBidCents !== null ? (
          // Only buyers so far — show the best offer to nudge sellers to list.
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm" style={{ color: "#B7C3D6" }}>
                Buyers offering
              </span>
              <span className="font-serif text-4xl tabular-nums">
                {formatPrice(stats.bestBidCents)}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: "#B7C3D6" }}>
              no tickets for sale yet — list yours and we&apos;ll match you
            </p>
          </>
        ) : (
          <>
            <p className="font-serif text-2xl">No listings yet</p>
            <p className="text-sm mt-1" style={{ color: "#B7C3D6" }}>
              Pick a price below — we&apos;ll match you automatically the moment a buyer and seller
              meet.
            </p>
          </>
        )}
      </div>

      {event.archivedAt ? (
        <div className="mt-5 border border-line bg-white rounded-xl px-5 py-4">
          <p className="font-medium">This event is archived</p>
          <p className="text-sm text-muted mt-1">New buy and sell orders are closed. Existing trade records remain available.</p>
        </div>
      ) : (
      <div className="grid sm:grid-cols-2 gap-4 mt-5">
        <Link
          href={`/events/${id}/order?side=buy`}
          className="block bg-white border border-line rounded-2xl p-5 hover:border-buy transition-colors group"
        >
          <p className="tag text-buy">Want a ticket?</p>
          <p className="font-serif text-2xl mt-1">Buy a ticket</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            {buyNow !== null ? (
              <>
                <span className="text-ink font-medium">Buy now for {formatPrice(buyNow)}</span> —
                or set the most you&apos;ll pay and we&apos;ll match you automatically.
              </>
            ) : (
              <>Set the most you&apos;ll pay and we&apos;ll match you the moment someone sells.</>
            )}
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-buy group-hover:underline">
            Start buying →
          </span>
        </Link>

        <Link
          href={`/events/${id}/order?side=sell`}
          className="block bg-white border border-line rounded-2xl p-5 hover:border-sell transition-colors group"
        >
          <p className="tag text-sell">Have a ticket?</p>
          <p className="font-serif text-2xl mt-1">Sell a ticket</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            {sellNow !== null ? (
              <>
                <span className="text-ink font-medium">Sell now for {formatPrice(sellNow)}</span> —
                or set the least you&apos;ll accept and we&apos;ll alert you when it sells.
              </>
            ) : (
              <>Set the least you&apos;ll accept and we&apos;ll alert you when someone wants one.</>
            )}
          </p>
          <span className="inline-block mt-3 text-sm font-medium text-sell group-hover:underline">
            Start selling →
          </span>
        </Link>
      </div>
      )}

      {/* Your orders here */}
      {(myMatches.length > 0 || myOrders.length > 0) && (
        <div className="mt-7">
          <p className="tag text-muted mb-3">Your orders here</p>
          <div className="space-y-2.5">
            {myMatches.map((m) => {
              const iAmBuyer = m.buyerId === user.id;
              const reserved = m.status === "RESERVED";
              return (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center justify-between gap-3 bg-columbia-soft border border-columbia/30 rounded-xl px-4 py-3 hover:border-columbia transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-columbia-deep">
                      {reserved ? "You matched! 🎟️" : "Deal in progress"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {iAmBuyer ? "Buying" : "Selling"} {m.reservedQuantity} ·{" "}
                      {formatPrice(m.settlePriceCents)}/ea ·{" "}
                      {reserved ? "confirm within 24h" : "chat & close the deal"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-columbia-deep shrink-0">
                    {reserved ? "Confirm →" : "Open →"}
                  </span>
                </Link>
              );
            })}

            {myOrders.map((o) => {
              const isBuy = o.type === "BUY";
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 bg-white border border-line rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className={`font-medium ${isBuy ? "text-buy" : "text-sell"}`}>
                        {isBuy ? "Buying" : "Selling"} {o.remainingQuantity}
                      </span>{" "}
                      · {isBuy ? "up to" : "at least"}{" "}
                      <span className="tabular-nums">{formatPrice(o.priceCents)}</span>/ea
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Live · we&apos;ll alert you when it matches
                    </p>
                  </div>
                  <div className="shrink-0">
                    <CancelListingButton listingId={o.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AdBanner placement="EVENT_PAGE" />

      <p className="text-xs text-muted mt-6 leading-relaxed">
        Live prices are offers from students. “Last sold” reflects the most recent completed trade.
      </p>
    </main>
  );
}
