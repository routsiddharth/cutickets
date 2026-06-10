"use client";

import { useActionState, useState } from "react";
import { createListing, type ActionState } from "@/lib/actions/listings";
import { MAX_TICKETS_PER_LISTING } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";

export default function OrderForm({
  eventId,
  side,
  bestAskCents,
  bestBidCents,
}: {
  eventId: string;
  side: "buy" | "sell";
  bestAskCents: number | null;
  bestBidCents: number | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createListing, undefined);
  const [qty, setQty] = useState(1);
  const isBuy = side === "buy";

  const priceLabel = isBuy
    ? "The most you'll pay per ticket"
    : "The least you'll accept per ticket";

  // The plain-language price anchor.
  const hint = isBuy
    ? bestAskCents !== null
      ? `Set it to ${formatPrice(bestAskCents)} to buy the cheapest ticket now. Bid higher to jump the line — you only ever pay the seller's price.`
      : "No one is selling yet — name your price and we'll match you the moment someone lists."
    : bestBidCents !== null
      ? `Set it to ${formatPrice(bestBidCents)} to sell to the top buyer now. Ask for more and we'll hold your ticket until a buyer meets it.`
      : "No one is buying yet — name your price and we'll alert you the moment someone wants one.";

  const accent = isBuy ? "bg-buy" : "bg-sell";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="type" value={isBuy ? "BUY" : "SELL"} />

      {/* quantity stepper */}
      <div>
        <label className="tag text-muted">How many tickets?</label>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Fewer tickets"
            className="w-10 h-10 rounded-lg border border-line text-xl leading-none grid place-items-center hover:bg-paper"
          >
            –
          </button>
          <span className="font-serif text-2xl tabular-nums w-8 text-center">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(MAX_TICKETS_PER_LISTING, q + 1))}
            aria-label="More tickets"
            className="w-10 h-10 rounded-lg border border-line text-xl leading-none grid place-items-center hover:bg-paper"
          >
            +
          </button>
          <span className="text-xs text-muted ml-1">up to {MAX_TICKETS_PER_LISTING}</span>
        </div>
        <input type="hidden" name="quantity" value={qty} />
      </div>

      {/* price */}
      <div>
        <label htmlFor="price" className="tag text-muted">
          {priceLabel}
        </label>
        <div className="mt-1.5 flex items-center border border-line rounded-lg bg-white px-3">
          <span className="text-muted text-sm">$</span>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder={
              isBuy
                ? bestAskCents !== null
                  ? String(Math.round(bestAskCents / 100))
                  : "35"
                : bestBidCents !== null
                  ? String(Math.round(bestBidCents / 100))
                  : "35"
            }
            required
            className="w-full px-2 py-2.5 text-sm bg-transparent outline-none"
          />
          <span className="text-muted text-sm">/ea</span>
        </div>
        <p className="text-xs text-muted mt-1.5">{hint}</p>
      </div>

      {/* notes */}
      <div>
        <label htmlFor="notes" className="tag text-muted">
          Notes <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Face value, can meet on campus. Tickets are on Posh."
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
        />
        <p className="text-xs text-muted mt-1">Only shown to your match after you connect.</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton
        pendingText="Placing…"
        className={`w-full ${accent} text-white text-center py-3 rounded-lg font-medium disabled:opacity-60`}
      >
        {isBuy ? "Place buy order" : "Place sell order"}
      </SubmitButton>
      <p className="text-xs text-muted text-center">
        If someone already matches your price, you&apos;ll be connected right away. No payment is
        handled here — you coordinate the transfer yourselves.
      </p>
    </form>
  );
}
