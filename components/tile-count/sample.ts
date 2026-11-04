// components/tile-count/sample.ts
// Builds a clearly synthetic sample photo so a new user can try every step
// without a real customer photo.

import { photographRoof, renderRoof } from "@/lib/tile-count/synthetic-roof";
import type { Quad, RgbaImage } from "@/lib/tile-count/types";

const WIDTH = 1500;
const HEIGHT = 1000;

/** Exact corners, so the sample starts from a correct count. */
export const SAMPLE_CORNERS: Quad = [
  { x: 330, y: 150 },
  { x: 1170, y: 170 },
  { x: 1420, y: 860 },
  { x: 80, y: 840 },
];

export function renderSamplePhoto(): RgbaImage {
  const roof = renderRoof({
    rows: 22,
    columns: 40,
    moss: 6,
    noise: 0.05,
    obstruction: { row: 6, column: 26, rows: 5, columns: 4 },
  });
  const photo = photographRoof(roof, SAMPLE_CORNERS, WIDTH, HEIGHT, -1);
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  photo.data.forEach((value, i) => {
    const p = i * 4;
    const sky = value < 0;
    const level = Math.min(1, Math.max(0, value)) * 255;
    data[p] = sky ? 150 : level;
    data[p + 1] = sky ? 195 : level * 0.43;
    data[p + 2] = sky ? 240 : level * 0.35;
    data[p + 3] = 255;
  });
  return { width: WIDTH, height: HEIGHT, data };
}
