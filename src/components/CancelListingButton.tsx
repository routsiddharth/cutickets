"use client";

import { useState, useTransition } from "react";
import { cancelListing } from "@/lib/actions/listings";

export default function CancelListingButton({ listingId }: { listingId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        onClick={() =>
          start(async () => {
            const res = await cancelListing(listingId);
            if (res?.error) setError(res.error);
          })
        }
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-md mt-1 border border-line text-muted hover:text-ink disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </span>
  );
}
