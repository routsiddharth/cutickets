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
        className="bg-ink text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-ink/90 disabled:opacity-60"
      >
        Buy for {formatPrice(priceCents)}
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600 mt-1.5" role="alert">{state.error}</p>}
    </form>
  );
}
