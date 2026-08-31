// Client-safe half of the flyer tint system: the shared color construction,
// the fixed default, and the four host-selectable org-color presets. Kept
// separate from flyerTint.ts because that file pulls in `sharp` (native,
// server-only) — this one is imported directly from the admin override
// picker client component.
import { oklchToHex } from "./color/oklch";

export type EventTint = {
  tintTop: string;
  tintMid: string;
  tintAccent: string | null; // null = flyer had no derivable hue; UI falls back to the fixed ink palette
};

export const DEFAULT_TINT: EventTint = { tintTop: "#FAF8F2", tintMid: "#FAF8F2", tintAccent: null };

/** Same L/C construction for both a poster-sampled hue and a fixed preset hue — only the hue source differs. */
export function buildTint(hue: number, sampledChroma: number): EventTint {
  const topChroma = Math.min(sampledChroma, 0.05);
  return {
    tintTop: oklchToHex(0.9, topChroma, hue),
    tintMid: oklchToHex(0.93, topChroma / 2, hue),
    tintAccent: oklchToHex(0.45, 0.07, hue),
  };
}

export const TINT_PRESETS = {
  COLUMBIA_BLUE: { label: "Columbia blue", hue: 230 },
  CRIMSON: { label: "Crimson", hue: 25 },
  FOREST: { label: "Forest green", hue: 150 },
  VIOLET: { label: "Violet", hue: 300 },
} as const;

export type TintPresetKey = keyof typeof TINT_PRESETS;

export function isTintPresetKey(value: string): value is TintPresetKey {
  return value in TINT_PRESETS;
}

export function resolvePresetTint(key: TintPresetKey): EventTint {
  return buildTint(TINT_PRESETS[key].hue, 0.05);
}
