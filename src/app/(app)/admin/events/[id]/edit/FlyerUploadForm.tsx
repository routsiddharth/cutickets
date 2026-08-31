"use client";

import { useActionState, useState, useTransition } from "react";
import { uploadEventFlyer, removeEventFlyer } from "@/lib/actions/flyer";
import SubmitButton from "@/components/SubmitButton";
import type { ActionState } from "@/lib/actions/types";

export default function FlyerUploadForm({
  eventId,
  flyerUrl,
}: {
  eventId: string;
  flyerUrl: string | null;
}) {
  const action = uploadEventFlyer.bind(null, eventId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePending, startRemove] = useTransition();

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <p className="text-sm font-medium">Flyer</p>
      <p className="text-xs text-muted mt-0.5 mb-4">
        Shown on the event card and page. Cropped to a 4:5 portrait and converted to AVIF automatically.
      </p>

      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0">
          <div className="relative aspect-[4/5] rounded-lg overflow-hidden border border-line flyer-placeholder">
            {(preview ?? flyerUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview ?? flyerUrl!}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </div>
        </div>

        <form action={formAction} className="flex-1 min-w-0 space-y-2.5">
          <input
            type="file"
            name="flyer"
            accept="image/*"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-line file:bg-paper file:text-sm file:font-medium"
          />
          {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-xs text-sell">Flyer updated.</p>}
          <div className="flex gap-2">
            <SubmitButton
              pendingText="Uploading…"
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-columbia text-white hover:bg-columbia-deep disabled:opacity-60"
            >
              {flyerUrl ? "Replace flyer" : "Upload flyer"}
            </SubmitButton>
            {flyerUrl && (
              <button
                type="button"
                disabled={removePending}
                onClick={() => {
                  if (confirm("Remove this flyer?")) startRemove(() => void removeEventFlyer(eventId));
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium border border-line text-muted hover:text-ink disabled:opacity-60"
              >
                {removePending ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
