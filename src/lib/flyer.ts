import sharp from "sharp";

// Every flyer is normalized to one format and one aspect ratio on upload, so
// display code never has to branch on source type/dimensions. AVIF over PNG:
// flyer art is photographic/gradient-heavy, and AVIF gets a fraction of the
// file size at equivalent visual quality — PNG would be lossless but multiple
// times heavier for no benefit once the source is already re-encoded.
export const FLYER_CONTENT_TYPE = "image/avif";
export const FLYER_WIDTH = 1080; // Instagram's 4:5 portrait spec
export const FLYER_HEIGHT = 1350;

export const FLYER_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class FlyerImageError extends Error {}

/** Cache-busted URL for an event's flyer image, or null if it has none. */
export function flyerUrl(eventId: string, flyerUpdatedAt: Date | string | null): string | null {
  if (!flyerUpdatedAt) return null;
  const v = new Date(flyerUpdatedAt).getTime();
  return `/api/events/${eventId}/flyer?v=${v}`;
}

/** Normalizes an uploaded image to a single cover-cropped 4:5 AVIF. */
export async function convertFlyerImage(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input)
      .rotate() // apply EXIF orientation before cropping
      .resize(FLYER_WIDTH, FLYER_HEIGHT, { fit: "cover", position: "attention" })
      .avif({ quality: 70 })
      .toBuffer();
  } catch {
    throw new FlyerImageError(
      "Couldn't read that image. Try a JPG, PNG, WEBP, or GIF (HEIC isn't supported).",
    );
  }
}
