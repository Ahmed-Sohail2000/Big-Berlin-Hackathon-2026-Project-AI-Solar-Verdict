// lib/tile-count/vision/photo-quality.ts
// Quick checks on the decoded photo, before anyone trusts a count from it. Sharpness
// is not judged here: the count's own confidence already covers blurred tile edges.
// PURE, DETERMINISTIC, no I/O.

import type { GrayImage } from "../types";

/** Below this, tiles at the far edge of a long roof shrink to a few pixels. */
export const MIN_SHORT_EDGE_PX = 1000;
const MAX_SAMPLES = 40_000;
const DARK_MEAN = 0.12;
const BRIGHT_MEAN = 0.92;

/** Plain-language problems with the photo itself. Empty means nothing stood out. */
export function assessPhoto(image: GrayImage): string[] {
  const warnings: string[] = [];
  const { width, height, data } = image;
  if (Math.min(width, height) < MIN_SHORT_EDGE_PX) {
    warnings.push(`This photo is only ${width} x ${height} pixels. Use the original file, not a preview or a messenger copy.`);
  }

  const stride = Math.max(1, Math.floor(data.length / MAX_SAMPLES));
  let sum = 0;
  let samples = 0;
  for (let i = 0; i < data.length; i += stride) {
    sum += data[i];
    samples++;
  }
  const mean = sum / samples;
  if (mean < DARK_MEAN) warnings.push("This photo is very dark, so tile edges may be lost in shadow.");
  if (mean > BRIGHT_MEAN) warnings.push("This photo is overexposed, so tile edges may be washed out.");
  return warnings;
}
