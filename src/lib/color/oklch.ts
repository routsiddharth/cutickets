// Minimal OKLCH <-> sRGB conversion (Björn Ottosson's OKLab, CSS Color 4).
// No dependency pulled in for this — it's ~40 lines of matrix math and the
// flyer tint sampler (src/lib/flyerTint.ts) is the only caller.

export type Oklch = { l: number; c: number; h: number }; // h in degrees [0, 360)

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

/** sRGB (0-255 per channel) to OKLCH. */
export function srgbToOklch(r: number, g: number, b: number): Oklch {
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

/** OKLCH to a "#rrggbb" hex string, clamped into sRGB gamut. */
export function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const ll = l_ * l_ * l_;
  const mm = m_ * m_ * m_;
  const ss = s_ * s_ * s_;

  const lr = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  const lg = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  const lb = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss;

  const r = linearChannelToSrgb(lr);
  const g = linearChannelToSrgb(lg);
  const bch = linearChannelToSrgb(lb);

  return `#${[r, g, bch].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Circular mean of a set of hue angles (degrees), for averaging survivor hues within a bucket. */
export function circularMeanHue(sumX: number, sumY: number): number {
  let h = (Math.atan2(sumY, sumX) * 180) / Math.PI;
  if (h < 0) h += 360;
  return h;
}
