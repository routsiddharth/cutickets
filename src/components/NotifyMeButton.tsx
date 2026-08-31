"use client";

import { useState, useTransition } from "react";
import { watchEvent } from "@/lib/actions/events";

export default function NotifyMeButton({
  eventId,
  initiallyWatching,
}: {
  eventId: string;
  initiallyWatching: boolean;
}) {
  const [watching, setWatching] = useState(initiallyWatching);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (watching) {
    return <p className="font-serif text-xl text-muted">You’re on the list</p>;
  }

  return (
    <span>
      <button
        onClick={() =>
          start(async () => {
            const res = await watchEvent(eventId);
            if (res?.error) setError(res.error);
            else setWatching(true);
          })
        }
        disabled={pending}
        className="bg-ink text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-ink/90 disabled:opacity-60"
      >
        {pending ? "…" : "Notify me"}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1.5" role="alert">
          {error}
        </p>
      )}
    </span>
  );
}
