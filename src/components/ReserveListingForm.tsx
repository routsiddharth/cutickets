"use client";

import { useActionState, useState } from "react";
import { reserveListing, type ActionState } from "@/lib/actions/listings";
import { formatPrice } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";

export default function ReserveListingForm({
  listingId,
  available,
  priceCents,
}: {
  listingId: string;
  available: number;
  priceCents: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [state, action] = useActionState<ActionState, FormData>(reserveListing, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      {available > 1 && (
        <select name="quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Ticket quantity" className="border border-line rounded-full bg-white px-3.5 py-2 text-sm">
          {Array.from({ length: available }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} ticket{value === 1 ? "" : "s"}</option>)}
        </select>
      )}
      {available === 1 && <input type="hidden" name="quantity" value="1" />}
      <SubmitButton pendingText="Buying…" className="bg-ink text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-ink/90 disabled:opacity-60">
        {available > 1 ? `Buy · ${formatPrice(priceCents * quantity)}` : "Buy"}
      </SubmitButton>
      {state?.error && <p className="basis-full sm:text-right text-xs text-red-600" role="alert">{state.error}</p>}
    </form>
  );
}
