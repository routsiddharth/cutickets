"use client";

import { useActionState } from "react";
import { createEvent, type ActionState } from "@/lib/actions/events";
import SubmitButton from "@/components/SubmitButton";

export default function EventForm() {
  const [state, action] = useActionState<ActionState, FormData>(
    createEvent,
    undefined,
  );

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="tag text-muted">
          Event name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="Bacchanal Spring Concert"
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="venue" className="tag text-muted">
            Venue <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="venue"
            name="venue"
            maxLength={120}
            placeholder="Low Plaza"
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
          />
        </div>
        <div>
          <label htmlFor="startsAt" className="tag text-muted">
            Date
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="date"
            required
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
          />
          <p className="text-xs text-muted mt-1">
            Sets when listings for this event come down (the day after).
          </p>
        </div>
      </div>
      <div>
        <label htmlFor="description" className="tag text-muted">
          Notes <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={500}
          rows={3}
          placeholder="Anything students should know about this event."
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton
        pendingText="Creating…"
        className="w-full bg-ink text-white text-center py-3 rounded-lg font-medium disabled:opacity-60"
      >
        Create event
      </SubmitButton>
    </form>
  );
}
