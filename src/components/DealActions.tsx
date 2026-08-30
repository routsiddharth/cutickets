"use client";

import { useActionState } from "react";
import { cancelDeal, confirmTrade, rateTrade, type ActionState } from "@/lib/actions/deals";
import SubmitButton from "@/components/SubmitButton";

export function ConfirmTradeForm({
  dealId,
  youConfirmed,
  theyConfirmed,
}: {
  dealId: string;
  youConfirmed: boolean;
  theyConfirmed: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(confirmTrade, undefined);
  if (youConfirmed) {
    return (
      <p className="text-sm text-sell font-medium">
        Confirmed{theyConfirmed ? " — trade complete" : " — waiting for them"}
      </p>
    );
  }
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="dealId" value={dealId} />
        <SubmitButton
          pendingText="Saving…"
          className="bg-ink text-white px-4 py-2.5 rounded-lg font-medium text-sm disabled:opacity-60"
        >
          I completed the trade
        </SubmitButton>
      </form>
      {state?.error && <p className="text-xs text-red-600 mt-2" role="alert">{state.error}</p>}
    </div>
  );
}

export function CancelDealForm({ dealId }: { dealId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(cancelDeal, undefined);
  return (
    <div>
      <form action={action}>
        <input type="hidden" name="dealId" value={dealId} />
        <SubmitButton
          pendingText="Cancelling…"
          className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-60"
        >
          Cancel reservation
        </SubmitButton>
      </form>
      {state?.error && <p className="text-xs text-red-600 mt-2" role="alert">{state.error}</p>}
    </div>
  );
}

export function RatingForm({
  dealId,
  existingStars,
}: {
  dealId: string;
  existingStars: number | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(rateTrade, undefined);
  if (existingStars && !state) {
    return <p className="text-sm text-muted">Your rating: {"★".repeat(existingStars)}</p>;
  }
  if (state?.ok) return <p className="text-sm text-sell font-medium" role="status">Rating saved</p>;

  return (
    <form action={action} className="grid sm:grid-cols-[auto_1fr_auto] gap-2">
      <input type="hidden" name="dealId" value={dealId} />
      <select name="stars" defaultValue="5" aria-label="Rating" className="border border-line rounded-lg px-3 py-2 text-sm bg-white">
        <option value="5">★★★★★</option>
        <option value="4">★★★★</option>
        <option value="3">★★★</option>
        <option value="2">★★</option>
        <option value="1">★</option>
      </select>
      <input name="comment" maxLength={300} placeholder="Optional note" className="border border-line rounded-lg px-3 py-2 text-sm bg-white" />
      <SubmitButton pendingText="Saving…" className="bg-ink text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
        Rate
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600 sm:col-span-3" role="alert">{state.error}</p>}
    </form>
  );
}
