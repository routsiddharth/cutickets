"use client";

import { useActionState, useState } from "react";
import { createListing, type ActionState } from "@/lib/actions/listings";
import { MAX_TICKETS_PER_LISTING } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";

type EventOption = { id: string; name: string; startsAt: string | null };

/** When does a listing for this event come down? The day after the event. */
function expiryLabel(event: EventOption | undefined): string | null {
  if (!event) return null;
  if (!event.startsAt) {
    return "No event date set — this listing stays up for 30 days.";
  }
  const dayAfter = new Date(new Date(event.startsAt).getTime() + 86_400_000);
  const when = dayAfter.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Comes down the day after the event — ${when}.`;
}

export default function ListingForm({
  events,
  defaultEventId,
  defaultType,
}: {
  events: EventOption[];
  defaultEventId?: string;
  defaultType: "SELL" | "BUY";
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createListing,
    undefined,
  );
  const [type, setType] = useState<"SELL" | "BUY">(defaultType);
  const [eventId, setEventId] = useState<string>(defaultEventId ?? "");

  const expiry = expiryLabel(events.find((e) => e.id === eventId));

  return (
    <form action={action} className="space-y-5">
      {/* Buy/sell toggle */}
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setType("SELL")}
          aria-pressed={type === "SELL"}
          className={`rounded-xl p-3 text-center border-2 transition-colors ${
            type === "SELL"
              ? "border-sell bg-sell-soft/60"
              : "border-line bg-white"
          }`}
        >
          <p className={`font-serif text-lg ${type === "SELL" ? "text-sell" : "text-muted"}`}>
            Selling
          </p>
          <p className="text-xs text-muted">I have tickets</p>
        </button>
        <button
          type="button"
          onClick={() => setType("BUY")}
          aria-pressed={type === "BUY"}
          className={`rounded-xl p-3 text-center border-2 transition-colors ${
            type === "BUY" ? "border-buy bg-buy-soft/60" : "border-line bg-white"
          }`}
        >
          <p className={`font-serif text-lg ${type === "BUY" ? "text-buy" : "text-muted"}`}>
            Buying
          </p>
          <p className="text-xs text-muted">I want tickets</p>
        </button>
      </div>

      <div>
        <label htmlFor="eventId" className="tag text-muted">
          Event
        </label>
        <select
          id="eventId"
          name="eventId"
          required
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        >
          <option value="" disabled>
            Choose an event…
          </option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        {expiry ? (
          <p className="text-xs text-muted mt-1.5">🗓️ {expiry}</p>
        ) : (
          <p className="text-xs text-muted mt-1">
            Don&apos;t see it?{" "}
            <a href="/events/new" className="text-columbia-deep hover:underline">
              Add the event first
            </a>
            .
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="quantity" className="tag text-muted">
            # Tickets
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            max={MAX_TICKETS_PER_LISTING}
            defaultValue={1}
            required
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
          />
        </div>
        <div>
          <label htmlFor="price" className="tag text-muted">
            {type === "SELL" ? "Asking / ticket" : "Bid / ticket"}
          </label>
          <div className="mt-1.5 flex items-center border border-line rounded-lg bg-white px-3">
            <span className="text-muted text-sm">$</span>
            <input
              id="price"
              name="price"
              inputMode="decimal"
              placeholder="35"
              required
              className="w-full px-2 py-2.5 text-sm bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="tag text-muted">
          Notes <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Face value, can meet on campus. Tickets are on Posh."
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton
        pendingText="Posting…"
        className="w-full bg-ink text-white text-center py-3 rounded-lg font-medium disabled:opacity-60"
      >
        Post to the board
      </SubmitButton>
      <p className="text-xs text-muted text-center">
        No payment is handled here. You&apos;ll coordinate the transfer yourself.
      </p>
    </form>
  );
}
