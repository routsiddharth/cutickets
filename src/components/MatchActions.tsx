"use client";

import { useActionState } from "react";
import {
  acceptReservation,
  declineReservation,
  confirmTrade,
  rateTrade,
  cancelMatch,
  type ActionState,
} from "@/lib/actions/matches";
import SubmitButton from "@/components/SubmitButton";

/** Stage 1: confirm or pass on an auto-generated match. */
export function AcceptReservationForm({
  matchId,
  youAccepted,
  theyAccepted,
}: {
  matchId: string;
  youAccepted: boolean;
  theyAccepted: boolean;
}) {
  const [acceptState, accept] = useActionState<ActionState, FormData>(
    acceptReservation,
    undefined,
  );
  const [declineState, decline] = useActionState<ActionState, FormData>(
    declineReservation,
    undefined,
  );

  if (youAccepted) {
    return (
      <p className="text-xs text-columbia-deep font-medium">
        ✓ You confirmed{theyAccepted ? " · all set" : " · waiting on them"}
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <form action={accept}>
          <input type="hidden" name="matchId" value={matchId} />
          <SubmitButton
            pendingText="…"
            className="text-xs bg-columbia-deep text-white px-3.5 py-1.5 rounded-md font-medium disabled:opacity-60"
          >
            Confirm match
          </SubmitButton>
        </form>
        <form action={decline}>
          <input type="hidden" name="matchId" value={matchId} />
          <SubmitButton
            pendingText="…"
            className="text-xs border border-line text-muted px-3.5 py-1.5 rounded-md hover:text-ink disabled:opacity-60"
          >
            No thanks
          </SubmitButton>
        </form>
      </div>
      {theyAccepted && (
        <p className="text-[11px] text-muted mt-1">
          They&apos;ve confirmed — confirm to reveal each other &amp; open the chat.
        </p>
      )}
      {(acceptState?.error || declineState?.error) && (
        <p className="text-xs text-red-600 mt-1">
          {acceptState?.error ?? declineState?.error}
        </p>
      )}
    </div>
  );
}

export function ConfirmTradeForm({
  matchId,
  youConfirmed,
  theyConfirmed,
}: {
  matchId: string;
  youConfirmed: boolean;
  theyConfirmed: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    confirmTrade,
    undefined,
  );

  if (youConfirmed) {
    return (
      <p className="text-xs text-sell font-medium">
        ✓ You confirmed{theyConfirmed ? " · trade complete" : " · waiting on them"}
      </p>
    );
  }

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="matchId" value={matchId} />
        <SubmitButton
          pendingText="…"
          className="text-xs bg-ink text-white px-3.5 py-1.5 rounded-md font-medium disabled:opacity-60"
        >
          Mark trade complete
        </SubmitButton>
      </form>
      {theyConfirmed && (
        <p className="text-[11px] text-muted mt-1">
          They&apos;ve confirmed — confirm to finish &amp; record the sale.
        </p>
      )}
      {state?.error && <p className="text-xs text-red-600 mt-1">{state.error}</p>}
    </div>
  );
}

export function CancelMatchForm({ matchId, label }: { matchId: string; label: string }) {
  const [state, action] = useActionState<ActionState, FormData>(
    cancelMatch,
    undefined,
  );
  return (
    <span>
      <form action={action} className="inline">
        <input type="hidden" name="matchId" value={matchId} />
        <SubmitButton
          pendingText="…"
          className="text-xs text-muted underline underline-offset-2 hover:text-ink disabled:opacity-60"
        >
          {label}
        </SubmitButton>
      </form>
      {state?.error && <p className="text-xs text-red-600 mt-1">{state.error}</p>}
    </span>
  );
}

export function RatingForm({
  matchId,
  existingStars,
}: {
  matchId: string;
  existingStars: number | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    rateTrade,
    undefined,
  );

  if (existingStars && !state) {
    return (
      <p className="text-xs text-muted">
        You rated this trade{" "}
        <span className="text-ink font-medium">
          {"★".repeat(existingStars)}
          {"☆".repeat(5 - existingStars)}
        </span>
      </p>
    );
  }

  if (state?.ok) {
    return <p className="text-xs text-sell font-medium">Thanks — rating saved ✓</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <select
        name="stars"
        defaultValue="5"
        aria-label="Rating"
        className="border border-line rounded-md px-2 py-1.5 text-xs bg-white"
      >
        <option value="5">★★★★★ Great</option>
        <option value="4">★★★★ Good</option>
        <option value="3">★★★ OK</option>
        <option value="2">★★ Poor</option>
        <option value="1">★ Bad</option>
      </select>
      <input
        name="comment"
        maxLength={300}
        placeholder="Optional note"
        className="border border-line rounded-md px-2 py-1.5 text-xs bg-white flex-1 min-w-[120px]"
      />
      <SubmitButton
        pendingText="…"
        className="text-xs bg-ink text-white px-3 py-1.5 rounded-md font-medium disabled:opacity-60"
      >
        Rate
      </SubmitButton>
      {state?.error && <p className="text-xs text-red-600 w-full">{state.error}</p>}
    </form>
  );
}
