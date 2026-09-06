"use client";

import { useState } from "react";
import Link from "next/link";
import { formatEventCardDate, formatPrice } from "@/lib/format";

// Single easing curve shared by every layer of the hover effect, so the lift,
// shadow, and CTA all feel like one physical motion.
const EASE = "cubic-bezier(.2, .8, .2, 1)";

const REQUEST_TILE_ID = "__request-event__";

export type EventCardData = {
  id: string;
  name: string;
  venue: string | null;
  startsAt: Date | null;
  flyer: string | null;
};

export type EventCardStats = {
  ticketsAvailable: number;
  lowestPriceCents: number | null;
  salesCount: number;
  lastSaleCents: number | null;
};

export default function EventsGrid({
  events,
}: {
  events: { event: EventCardData; stats: EventCardStats }[];
}) {
  // One hovered id for the whole grid — every card reads this instead of its
  // own CSS :hover, so the card animates as a unit even when the cursor is
  // over a child (the poster, the CTA, etc).
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const clear = (id: string) => setHoveredId((current) => (current === id ? null : current));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {events.map(({ event, stats }) => (
        <EventCard
          key={event.id}
          event={event}
          stats={stats}
          hovered={hoveredId === event.id}
          onHoverStart={() => setHoveredId(event.id)}
          onHoverEnd={() => clear(event.id)}
        />
      ))}
      <RequestEventTile
        hovered={hoveredId === REQUEST_TILE_ID}
        onHoverStart={() => setHoveredId(REQUEST_TILE_ID)}
        onHoverEnd={() => clear(REQUEST_TILE_ID)}
      />
    </div>
  );
}

function EventCard({
  event,
  stats,
  hovered,
  onHoverStart,
  onHoverEnd,
}: {
  event: EventCardData;
  stats: EventCardStats;
  hovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const hasAvailable = stats.lowestPriceCents !== null;
  const scarce = hasAvailable && stats.ticketsAvailable <= 2;
  const soldLine =
    stats.salesCount > 0 && stats.lastSaleCents !== null
      ? `${stats.salesCount} sold · last at ${formatPrice(stats.lastSaleCents)}`
      : "No sales yet";

  return (
    <Link
      href={`/events/${event.id}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="group block bg-card rounded-2xl overflow-hidden"
      style={{
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? "inset 0 0 0 1px #E0D8C6, 0 20px 36px rgba(22,35,58,.16)"
          : "inset 0 0 0 1px #EDE7DA, 0 1px 2px rgba(22,35,58,.04)",
        // The tear notch on the left/right edges is a flat cutout color, not
        // a real hole, so a shadow reaching the card's own edges shows up as
        // a mismatched pale disc instead of blending into the page. Clipping
        // the shadow to the card's sides/top and letting it bleed only below
        // keeps it off the notches entirely (and reads as a more natural
        // "lifted straight up" cast shadow).
        clipPath: "inset(0 0 -80px 0)",
        transition: `transform 500ms ${EASE}, box-shadow 300ms ${EASE}`,
      }}
    >
      <div className={`relative aspect-[4/5] overflow-hidden ${event.flyer ? "bg-ink/5" : "flyer-placeholder"}`}>
        {event.flyer ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.flyer}
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

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            {hasAvailable ? (
              <p className="font-serif text-2xl leading-none tabular-nums">
                {formatPrice(stats.lowestPriceCents!)}
              </p>
            ) : (
              <p className="font-serif text-xl leading-none text-muted">None right now</p>
            )}
            <p className="font-mono text-[11px] text-muted mt-1 truncate">{soldLine}</p>
          </div>

          <span
            className="shrink-0 relative overflow-hidden inline-block text-xs font-medium px-3.5 py-2 rounded-lg"
            style={
              hasAvailable
                ? {
                    color: "#fff",
                    backgroundColor: hovered ? "#22344F" : "#16233A",
                    transform: hovered ? "translateY(-2px)" : "translateY(0)",
                    transition: `background-color 220ms ${EASE}, transform 220ms ${EASE}`,
                  }
                : {
                    color: "#5C6B7A",
                    boxShadow: "inset 0 0 0 1px #E7E2D8",
                    transform: hovered ? "translateY(-2px)" : "translateY(0)",
                    transition: `transform 220ms ${EASE}`,
                  }
            }
          >
            <span className="relative">{hasAvailable ? "Buy Now" : "Notify me"}</span>
            {hasAvailable && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-2/5"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,.32), transparent)",
                  transform: hovered ? "translateX(220%)" : "translateX(-120%)",
                  transition: hovered ? "transform 900ms ease-out" : "none",
                }}
              />
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RequestEventTile({
  hovered,
  onHoverStart,
  onHoverEnd,
}: {
  hovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  return (
    <Link
      href="/events/request"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="group block rounded-2xl overflow-hidden bg-card"
      style={{
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? "inset 0 0 0 2px #E0D8C6, 0 20px 36px rgba(22,35,58,.16)"
          : "inset 0 0 0 2px #EDE7DA, 0 1px 2px rgba(22,35,58,.04)",
        clipPath: "inset(0 0 -80px 0)",
        transition: `transform 500ms ${EASE}, box-shadow 300ms ${EASE}`,
      }}
    >
      <div className="relative aspect-[4/5] flex flex-col items-center justify-center gap-2 text-muted group-hover:text-columbia-deep transition-colors">
        <div className="flex flex-col items-center gap-2 translate-y-3">
          <span className="w-9 h-9 rounded-full border border-current grid place-items-center text-lg leading-none">
            +
          </span>
          <span className="text-sm font-medium">Request an event</span>
        </div>
      </div>

      {/* Invisible mirror of EventCard's info panel — reserves the exact same
          height so this tile matches a real card even when it lands alone in
          its own grid row. Only the tear divider stays visible. */}
      <div className="p-4 invisible" aria-hidden="true">
        <p className="font-mono text-[11px] tracking-wide">&nbsp;</p>
        <p className="font-serif text-xl mt-1">&nbsp;</p>
        <p className="text-xs mt-0.5">&nbsp;</p>

        <div className="tear tear-thick -mx-4 my-3 visible" />

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <p className="font-serif text-2xl leading-none">&nbsp;</p>
            <p className="font-mono text-[11px] mt-1">&nbsp;</p>
          </div>
          <span className="shrink-0 text-xs font-medium px-3.5 py-2 rounded-lg border border-line">
            &nbsp;
          </span>
        </div>
      </div>
    </Link>
  );
}
