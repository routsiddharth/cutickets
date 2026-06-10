"use client";

import { useActionState } from "react";
import { expressInterest, type ActionState } from "@/lib/actions/matches";

export default function InterestButton({
  listingId,
  label,
  variant,
}: {
  listingId: string;
  label: string;
  variant: "sell" | "buy";
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    expressInterest,
    undefined,
  );

  if (state?.ok) {
    return (
      <span className="inline-block text-xs px-3 py-1.5 rounded-md mt-1 font-medium bg-columbia-soft text-columbia-deep">
        Reached out ✓
      </span>
    );
  }

  const solid =
    variant === "sell"
      ? "bg-sell text-white"
      : "bg-buy text-white";

  return (
    <form action={action} className="mt-1">
      <input type="hidden" name="listingId" value={listingId} />
      <button
        type="submit"
        className={`text-xs px-3 py-1.5 rounded-md font-medium ${solid} hover:opacity-90`}
      >
        {label}
      </button>
      {state?.error && (
        <p className="text-[11px] text-red-600 mt-1 max-w-[140px]">{state.error}</p>
      )}
    </form>
  );
}
