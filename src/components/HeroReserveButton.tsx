"use client";

import { useActionState } from "react";
import { reserveListing, type ActionState } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";

/** The hero's one-tap shortcut: reserve a single ticket from the event's cheapest listing. */
export default function HeroReserveButton({ listingId, priceCents }: { listingId: string; priceCents: number }) {
  const [state, action] = useActionState<ActionState, FormData>(reserveListing, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="quantity" value="1" />
      <SubmitButton
        pendingText="Reserving…"
        className="bg-sell text-white rounded-lg px-5 py-3 text-sm font-medium hover:bg-sell/90 disabled:opacity-60"
      >
        Reserve at {formatPrice(priceCents)}
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600 mt-1.5" role="alert">{state.error}</p>}
    </form>
  );
}
