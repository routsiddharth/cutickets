"use client";

import { useTransition } from "react";
import { setEventTintOverride } from "@/lib/actions/flyer";
import { TINT_PRESETS, resolvePresetTint, type TintPresetKey } from "@/lib/tintPresets";

const PRESET_KEYS = Object.keys(TINT_PRESETS) as TintPresetKey[];

export default function TintOverridePicker({
  eventId,
  tintOverride,
  tintTop,
}: {
  eventId: string;
  tintOverride: string | null;
  tintTop: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const choose = (key: TintPresetKey | "AUTO") => {
    startTransition(() => void setEventTintOverride(eventId, key));
  };

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <p className="text-sm font-medium">Hero color</p>
      <p className="text-xs text-muted mt-0.5 mb-4">
        Sampled from the flyer automatically. Override it with your org's color instead.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("AUTO")}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium border disabled:opacity-60 ${
            tintOverride === null ? "border-columbia bg-columbia-soft text-columbia-deep" : "border-line text-muted hover:text-ink"
          }`}
        >
          From poster
        </button>

        {PRESET_KEYS.map((key) => {
          const preset = TINT_PRESETS[key];
          const active = tintOverride === key;
          return (
            <button
              key={key}
              type="button"
              disabled={pending}
              onClick={() => choose(key)}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium border disabled:opacity-60 ${
                active ? "border-columbia bg-columbia-soft text-columbia-deep" : "border-line text-muted hover:text-ink"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-line/60 shrink-0"
                style={{ background: resolvePresetTint(key).tintAccent ?? undefined }}
                aria-hidden
              />
              {preset.label}
            </button>
          );
        })}
      </div>

      {tintTop && (
        <div className="mt-4 h-8 rounded-lg border border-line" style={{ background: tintTop }} aria-hidden />
      )}
    </div>
  );
}
