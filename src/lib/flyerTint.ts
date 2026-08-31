import sharp from "sharp";
import { srgbToOklch, circularMeanHue, oklchToHex } from "./color/oklch";
import { buildTint, DEFAULT_TINT, type EventTint } from "./tintPresets";

export type { EventTint } from "./tintPresets";
export { DEFAULT_TINT, TINT_PRESETS, isTintPresetKey, resolvePresetTint, type TintPresetKey } from "./tintPresets";

// Per-event hero tint, sampled once from the flyer at upload time and cached
// on the Event row (Event.tintTop/tintMid/tintAccent) — never recomputed at
// render time. The wash color (tintTop/tintMid) is the area-weighted
// dominant hue, so a large cream background wins over a small saturated
// logo; the accent is deliberately picked separately, by peak chroma rather
// than area, so a low-alpha accent still carries real color even when the
// dominant wash is desaturated (e.g. a mostly near-black poster with one
// saturated gold detail).

const SAMPLE_SIZE = 48;
const HUE_BUCKETS = 24;
const BUCKET_WIDTH = 360 / HUE_BUCKETS;

const MIN_LIGHTNESS = 0.03;
const MAX_LIGHTNESS = 0.95;
const MIN_CHROMA = 0.02;

type Bucket = { count: number; sumChroma: number; sumX: number; sumY: number };

/** Downscales a flyer image to 48x48, bins survivor pixels by hue, and derives the hero tint. */
export async function computeFlyerTint(imageBuffer: Buffer): Promise<EventTint> {
  const { data, info } = await sharp(imageBuffer)
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .flatten({ background: "#ffffff" }) // composite transparency onto white before sampling
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS }, () => ({
    count: 0,
    sumChroma: 0,
    sumX: 0,
    sumY: 0,
  }));

  for (let i = 0; i + channels <= data.length; i += channels) {
    const { l, c, h } = srgbToOklch(data[i], data[i + 1], data[i + 2]);
    if (l > MAX_LIGHTNESS || l < MIN_LIGHTNESS || c < MIN_CHROMA) continue;

    const bucket = buckets[Math.min(HUE_BUCKETS - 1, Math.floor(h / BUCKET_WIDTH))];
    bucket.count += 1;
    bucket.sumChroma += c;
    const hRad = (h * Math.PI) / 180;
    bucket.sumX += Math.cos(hRad);
    bucket.sumY += Math.sin(hRad);
  }

  // Wash hue: the bucket that dominates the flyer by area × saturation — this
  // is what stops a large dull background from losing to a small vivid spot.
  let washIndex = -1;
  let washScore = -Infinity;
  // Accent hue: the single most saturated bucket, regardless of area — a
  // small vivid logo detail (e.g. a gold crest) should still supply the
  // accent even when a huge, barely-chromatic background wins the wash.
  let accentIndex = -1;
  let accentMeanChroma = -Infinity;

  for (let i = 0; i < HUE_BUCKETS; i++) {
    const bucket = buckets[i];
    if (bucket.count === 0) continue;
    const meanChroma = bucket.sumChroma / bucket.count;
    const score = bucket.count * meanChroma;
    if (score > washScore) {
      washScore = score;
      washIndex = i;
    }
    if (meanChroma > accentMeanChroma) {
      accentMeanChroma = meanChroma;
      accentIndex = i;
    }
  }

  if (washIndex === -1) return DEFAULT_TINT; // no pixel survived the L/C filter — flat black-and-white flyer

  const washBucket = buckets[washIndex];
  const washHue = circularMeanHue(washBucket.sumX, washBucket.sumY);
  const sampledChroma = washBucket.sumChroma / washBucket.count;
  const { tintTop, tintMid } = buildTint(washHue, sampledChroma);

  const accentBucket = buckets[accentIndex];
  const accentHue = circularMeanHue(accentBucket.sumX, accentBucket.sumY);
  const tintAccent = oklchToHex(0.45, 0.07, accentHue);

  return { tintTop, tintMid, tintAccent };
}
