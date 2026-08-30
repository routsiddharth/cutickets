"use client";

import type { FormEvent } from "react";
import SubmitButton from "@/components/SubmitButton";
import { archiveEventForm, dismissEventRequestForm, restoreEventForm } from "@/lib/actions/events";

type ActionKind = "archive" | "restore" | "dismiss-request";

const config = {
  archive: {
    label: "Archive",
    pending: "Archiving…",
    confirm: "Archive this event? Its open orders will be cancelled and affected students will be notified.",
    className: "text-sm text-red-600 hover:underline disabled:opacity-60",
  },
  restore: {
    label: "Restore",
    pending: "Restoring…",
    confirm: "Restore this event and allow new orders again?",
    className: "text-sm text-columbia-deep hover:underline disabled:opacity-60",
  },
  "dismiss-request": {
    label: "Dismiss",
    pending: "Dismissing…",
    confirm: "Dismiss this request? The student will be notified.",
    className: "text-sm text-muted hover:text-ink disabled:opacity-60",
  },
} satisfies Record<ActionKind, { label: string; pending: string; confirm: string; className: string }>;

export default function AdminEventAction({ kind, id }: { kind: ActionKind; id: string }) {
  const item = config[kind];
  const action = kind === "archive"
    ? archiveEventForm.bind(null, id)
    : kind === "restore"
      ? restoreEventForm.bind(null, id)
      : dismissEventRequestForm.bind(null, id);

  function confirmAction(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(item.confirm)) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={confirmAction}>
      <SubmitButton pendingText={item.pending} className={item.className}>{item.label}</SubmitButton>
    </form>
  );
}
