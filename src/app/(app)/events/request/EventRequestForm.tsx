"use client";

import { useActionState } from "react";
import { requestEvent, type ActionState } from "@/lib/actions/events";
import SubmitButton from "@/components/SubmitButton";

export default function EventRequestForm({ defaultName }: { defaultName?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(requestEvent, undefined);

  if (state?.ok) {
    return (
      <div className="border border-line bg-white rounded-xl px-5 py-6" role="status">
        <p className="font-medium">Request sent</p>
        <p className="text-sm text-muted mt-1">An admin will review it. We’ll notify you when it’s added.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="text-sm font-medium">Event name</label>
        <input id="name" name="name" required maxLength={120} defaultValue={defaultName}
          placeholder="Bacchanal Spring Concert"
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="venue" className="text-sm font-medium">Venue <span className="font-normal text-muted">(optional)</span></label>
          <input id="venue" name="venue" maxLength={120} placeholder="Low Plaza"
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
        </div>
        <div>
          <label htmlFor="startsAt" className="text-sm font-medium">Date <span className="font-normal text-muted">(optional)</span></label>
          <input id="startsAt" name="startsAt" type="date"
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
        </div>
      </div>
      <div>
        <label htmlFor="details" className="text-sm font-medium">Details <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="details" name="details" maxLength={500} rows={3}
          placeholder="A link or anything that will help us identify the event."
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white resize-none" />
      </div>
      {state?.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <SubmitButton pendingText="Sending…"
        className="w-full bg-ink text-white py-3 rounded-lg font-medium disabled:opacity-60">
        Request event
      </SubmitButton>
    </form>
  );
}
