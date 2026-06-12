"use client";

import { useState, useTransition, useActionState } from "react";
import { createAd, updateAd, deleteAd, toggleAd } from "@/lib/actions/admin";
import SubmitButton from "@/components/SubmitButton";
import type { ActionState } from "@/lib/actions/types";

type AdRow = {
  id: string;
  title: string;
  imageUrl: string | null;
  linkUrl: string | null;
  body: string | null;
  placement: string;
  active: boolean;
  createdAt: string;
};

const PLACEMENTS = [
  { value: "EVENTS_LIST", label: "Events list page" },
  { value: "EVENT_PAGE", label: "Individual event page" },
];

const inputCls =
  "w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-columbia";
const btnBase = "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60";
const btnPrimary = `${btnBase} bg-columbia text-white hover:bg-columbia-deep`;
const btnGhost = `${btnBase} border border-line text-muted hover:text-ink`;
const btnDanger = `${btnBase} bg-red-50 text-red-700 hover:bg-red-100 border border-red-200`;

function AdForm({
  ad,
  onCancel,
}: {
  ad?: AdRow;
  onCancel?: () => void;
}) {
  const isEdit = !!ad;

  const createAction = async (prev: ActionState, formData: FormData) => createAd(prev, formData);
  const editAction = async (prev: ActionState, formData: FormData) =>
    updateAd(ad!.id, prev, formData);

  const [state, action] = useActionState(isEdit ? editAction : createAction, undefined);

  return (
    <form action={action} className="space-y-3">
      <div>
        <input
          name="title"
          defaultValue={ad?.title}
          placeholder="Ad title"
          required
          className={inputCls}
        />
      </div>
      <div>
        <select name="placement" defaultValue={ad?.placement ?? "EVENTS_LIST"} className={inputCls}>
          {PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <textarea
          name="body"
          defaultValue={ad?.body ?? ""}
          placeholder="Ad body text (optional)"
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <input
          name="imageUrl"
          defaultValue={ad?.imageUrl ?? ""}
          placeholder="Image URL (optional)"
          className={inputCls}
        />
      </div>
      <div>
        <input
          name="linkUrl"
          defaultValue={ad?.linkUrl ?? ""}
          placeholder="Link URL (optional)"
          className={inputCls}
        />
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton pendingText={isEdit ? "Saving…" : "Creating…"} className={btnPrimary}>
          {isEdit ? "Save changes" : "Create ad"}
        </SubmitButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btnGhost}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function AdCard({ ad }: { ad: AdRow }) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="px-4 py-4">
        <AdForm ad={ad} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{ad.title}</p>
            <span className="text-xs bg-paper border border-line px-1.5 py-0.5 rounded text-muted">
              {PLACEMENTS.find((p) => p.value === ad.placement)?.label ?? ad.placement}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                ad.active
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
              }`}
            >
              {ad.active ? "Active" : "Inactive"}
            </span>
          </div>
          {ad.body && <p className="text-xs text-muted mt-1 truncate">{ad.body}</p>}
          {ad.linkUrl && (
            <p className="text-xs text-columbia-deep mt-0.5 truncate">{ad.linkUrl}</p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => startTransition(() => toggleAd(ad.id))}
            className={btnGhost}
          >
            {ad.active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => setEditing(true)} className={btnGhost}>
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this ad?")) startTransition(() => deleteAd(ad.id));
            }}
            className={btnDanger}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdsClient({ ads }: { ads: AdRow[] }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-8">
      {/* Create form */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="tag text-muted">New ad</p>
          {!showCreate && (
            <button onClick={() => setShowCreate(true)} className={btnPrimary}>
              + Add ad
            </button>
          )}
        </div>
        {showCreate && (
          <div className="bg-white border border-line rounded-2xl p-5">
            <AdForm onCancel={() => setShowCreate(false)} />
          </div>
        )}
      </section>

      {/* Ad list */}
      <section>
        <p className="tag text-muted mb-3">All ads{ads.length > 0 ? ` · ${ads.length}` : ""}</p>
        {ads.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-xl p-8 text-center text-sm text-muted">
            No ads yet.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
