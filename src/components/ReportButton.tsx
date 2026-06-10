"use client";

import { useActionState, useState } from "react";
import { reportUser, type ActionState } from "@/lib/actions/reports";
import { REPORT_REASONS } from "@/lib/constants";
import SubmitButton from "@/components/SubmitButton";

export default function ReportButton({ reportedId }: { reportedId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(
    reportUser,
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="text-sm text-muted text-center">
        ✓ Thanks — this report was sent to moderators.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-line rounded-lg py-2.5 text-center text-sm text-muted hover:text-ink"
      >
        ⚑ Report user
      </button>
    );
  }

  return (
    <form action={action} className="border border-line rounded-lg p-4 space-y-3">
      <input type="hidden" name="reportedId" value={reportedId} />
      <p className="tag text-muted">Report this user</p>
      <select
        name="reason"
        required
        defaultValue=""
        className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
      >
        <option value="" disabled>
          Reason…
        </option>
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <textarea
        name="details"
        rows={2}
        maxLength={500}
        placeholder="What happened? (optional)"
        className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 border border-line rounded-lg py-2 text-sm text-muted"
        >
          Cancel
        </button>
        <SubmitButton
          pendingText="Sending…"
          className="flex-1 bg-ink text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
        >
          Submit report
        </SubmitButton>
      </div>
    </form>
  );
}
