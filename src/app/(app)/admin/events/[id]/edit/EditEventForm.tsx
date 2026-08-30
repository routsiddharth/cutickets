"use client";

import { useActionState } from "react";
import { updateEvent, type ActionState } from "@/lib/actions/events";
import SubmitButton from "@/components/SubmitButton";

type EditableEvent = {
  id: string;
  name: string;
  venue: string | null;
  startsAt: string;
  startsTime: string;
  description: string | null;
  poshLink: string | null;
};

export default function EditEventForm({ event }: { event: EditableEvent }) {
  const action = updateEvent.bind(null, event.id);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="text-sm font-medium">Event name</label>
        <input id="name" name="name" required maxLength={120} defaultValue={event.name}
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="venue" className="text-sm font-medium">Venue <span className="font-normal text-muted">(optional)</span></label>
          <input id="venue" name="venue" maxLength={120} defaultValue={event.venue ?? ""}
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
        </div>
        <div>
          <label htmlFor="startsAt" className="text-sm font-medium">Date</label>
          <input id="startsAt" name="startsAt" type="date" required defaultValue={event.startsAt}
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
        </div>
        <div>
          <label htmlFor="startsTime" className="text-sm font-medium">Start time</label>
          <input id="startsTime" name="startsTime" type="time" required defaultValue={event.startsTime}
            className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="text-sm font-medium">Notes <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="description" name="description" maxLength={500} rows={3} defaultValue={event.description ?? ""}
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white resize-none" />
      </div>
      <div>
        <label htmlFor="poshLink" className="text-sm font-medium">Event page <span className="font-normal text-muted">(optional)</span></label>
        <input id="poshLink" name="poshLink" type="url" maxLength={500} defaultValue={event.poshLink ?? ""}
          className="mt-1.5 w-full border border-line rounded-lg px-3 py-2.5 text-base bg-white" />
      </div>
      {state?.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-sell" role="status">Changes saved.</p>}
      <SubmitButton pendingText="Saving…" className="w-full bg-ink text-white py-3 rounded-lg font-medium disabled:opacity-60">Save changes</SubmitButton>
    </form>
  );
}
