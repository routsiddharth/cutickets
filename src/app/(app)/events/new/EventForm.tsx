"use client";

import { useActionState } from "react";
import { createEvent, type ActionState } from "@/lib/actions/events";
import SubmitButton from "@/components/SubmitButton";

type EventDefaults = {
  name?: string;
  host?: string;
  venue?: string;
  startsAt?: string;
  startsTime?: string;
  description?: string;
};

export default function EventForm({
  defaults,
  requestId,
}: {
  defaults?: EventDefaults;
  requestId?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createEvent,
    undefined,
  );

  return (
    <form action={action} className="space-y-5">
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      <div>
        <label htmlFor="name" className="tag text-muted">
          Event name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={defaults?.name}
          placeholder="Bacchanal Spring Concert"
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        />
      </div>
      <div>
        <label htmlFor="host" className="tag text-muted">
          Hosting org <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="host"
          name="host"
          maxLength={120}
          defaultValue={defaults?.host}
          placeholder="Sigma Phi Epsilon"
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
        />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="venue" className="tag text-muted">
            Venue <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="venue"
            name="venue"
            maxLength={120}
            defaultValue={defaults?.venue}
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
            defaultValue={defaults?.startsAt}
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
          />
          <p className="text-xs text-muted mt-1">
            Sets when listings for this event come down (the day after).
          </p>
        </div>
        <div>
          <label htmlFor="startsTime" className="tag text-muted">Start time</label>
          <input
            id="startsTime"
            name="startsTime"
            type="time"
            required
            defaultValue={defaults?.startsTime}
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
          />
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
          defaultValue={defaults?.description}
          rows={3}
          placeholder="Anything students should know about this event."
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
        />
      </div>
      <div>
        <label htmlFor="poshLink" className="tag text-muted">
          Event page <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="poshLink"
          name="poshLink"
          type="url"
          maxLength={500}
          placeholder="e.g. https://posh.vip/e/your-event"
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
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
