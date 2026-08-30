"use client";

import { useActionState, useState } from "react";
import { createListing, type ActionState } from "@/lib/actions/listings";
import { MAX_TICKETS_PER_LISTING } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";

export default function ListingForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createListing, undefined);
  const [quantity, setQuantity] = useState(1);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <label className="block text-sm font-medium mb-2">Tickets available</label>
        <div className="flex items-center gap-3">
          <button type="button" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Remove one ticket" className="w-10 h-10 border border-line rounded-lg text-lg hover:border-muted disabled:opacity-35 disabled:cursor-not-allowed">−</button>
          <span className="w-8 text-center text-xl tabular-nums">{quantity}</span>
          <button type="button" disabled={quantity === MAX_TICKETS_PER_LISTING} onClick={() => setQuantity((value) => Math.min(MAX_TICKETS_PER_LISTING, value + 1))} aria-label="Add one ticket" className="w-10 h-10 border border-line rounded-lg text-lg hover:border-muted disabled:opacity-35 disabled:cursor-not-allowed">+</button>
        </div>
        <input type="hidden" name="quantity" value={quantity} />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium mb-2">Price per ticket</label>
        <div className="flex items-center border border-line rounded-lg bg-white px-3 focus-within:border-columbia">
          <span className="text-muted">$</span>
          <input id="price" name="price" inputMode="decimal" required placeholder="40" className="w-full px-2 py-2.5 bg-transparent outline-none" />
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-2">Private note <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="notes" name="notes" rows={3} maxLength={500} placeholder="Ticket platform, transfer details, or when you can meet." className="w-full border border-line rounded-lg px-3 py-2.5 bg-white resize-none" />
        <p className="text-xs text-muted mt-1.5">Shown only after a buyer reserves.</p>
      </div>

      {state?.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <SubmitButton pendingText="Publishing…" className="w-full bg-sell text-white py-3 rounded-lg font-medium disabled:opacity-60">
        Publish listing
      </SubmitButton>
    </form>
  );
}
