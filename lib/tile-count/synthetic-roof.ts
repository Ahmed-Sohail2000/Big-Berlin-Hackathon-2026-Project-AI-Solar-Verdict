// lib/tile-count/synthetic-roof.ts
// Renders tiled roofs with a known count, so tests have an exact answer. These
// images prove the maths; they say nothing about accuracy on real photos.

import { rectangleQuad } from "./rectify";
import { applyHomography, computeHomography } from "./homography";
import type { GrayImage, Quad, RgbaImage } from "./types";

/** Seeded generator so every test run sees identical pixels. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export interface RoofOptions {
  rows: number;
  columns: number;
  tileWidthPx?: number;
  tileHeightPx?: number;
  /** Half-tile offset on alternate courses. */
  staggered?: boolean;
  /** Pixel noise amplitude (0..1). */
  noise?: number;
  /** Number of soft dark moss patches. */
  moss?: number;
  /** Broad shadow across one side. */
  shadow?: boolean;
  /** Blank rectangle in tile units, standing in for a roof window. */
  obstruction?: { row: number; column: number; rows: number; columns: number };
  seed?: number;
}

export function renderRoof(options: RoofOptions): GrayImage {
  const {
    rows,
    columns,
    tileWidthPx = 30,
    tileHeightPx = 36,
    staggered = true,
    noise = 0,
    moss = 0,
    shadow = false,
    obstruction,
    seed = 1,
  } = options;
  const random = seededRandom(seed);
  const width = columns * tileWidthPx;
  const height = rows * tileHeightPx;
  const data = new Float32Array(width * height);
  const tones = Array.from({ length: (rows + 1) * (columns + 2) }, () => 0.5 + random() * 0.12);

  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / tileHeightPx);
    const offset = staggered && row % 2 === 1 ? Math.floor(tileWidthPx / 2) : 0;
    const v = (y % tileHeightPx) / tileHeightPx;
    for (let x = 0; x < width; x++) {
      const shifted = x + offset;
      const column = Math.floor(shifted / tileWidthPx);
      const u = (shifted % tileWidthPx) / tileWidthPx;
      // Each tile is lit at the top and shaded where the next course overlaps it.
      let value = tones[row * (columns + 2) + column] - 0.18 * v;
      if (v < 0.08) value -= 0.25;
      if (u < 0.07) value -= 0.2;
      data[y * width + x] = value;
    }
  }

  for (let m = 0; m < moss; m++) {
    const cx = random() * width;
    const cy = random() * height;
    const radius = 30 + random() * 60;
    for (let y = Math.max(0, Math.floor(cy - radius)); y < Math.min(height, cy + radius); y++) {
      for (let x = Math.max(0, Math.floor(cx - radius)); x < Math.min(width, cx + radius); x++) {
        const d = Math.hypot(x - cx, y - cy) / radius;
        if (d < 1) data[y * width + x] *= 1 - 0.35 * (1 - d);
      }
    }
  }

  if (shadow) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width * 0.4; x++) data[y * width + x] *= 0.6;
    }
  }

  if (obstruction) {
    const { row, column, rows: blockRows, columns: blockColumns } = obstruction;
    for (let y = row * tileHeightPx; y < (row + blockRows) * tileHeightPx; y++) {
      for (let x = column * tileWidthPx; x < (column + blockColumns) * tileWidthPx; x++) {
        data[y * width + x] = 0.3;
      }
    }
  }

  if (noise > 0) {
    for (let i = 0; i < data.length; i++) data[i] += (random() - 0.5) * noise;
  }
  return { width, height, data };
}

/** Pure noise with no pattern: the stand-in for a photo with invisible tile edges. */
export function renderNoise(width: number, height: number, seed = 7): GrayImage {
  const random = seededRandom(seed);
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = random();
  return { width, height, data };
}

/** Places a flat roof into a larger frame at the given corners, like an oblique photo. */
export function photographRoof(
  roof: GrayImage,
  quad: Quad,
  frameWidth: number,
  frameHeight: number,
  background = 0.85,
): GrayImage {
  const toRoof = computeHomography(quad, rectangleQuad(roof.width, roof.height));
  if (!toRoof) throw new Error("Degenerate test quad");
  const data = new Float32Array(frameWidth * frameHeight).fill(background);
  for (let y = 0; y < frameHeight; y++) {
    for (let x = 0; x < frameWidth; x++) {
      const p = applyHomography(toRoof, { x: x + 0.5, y: y + 0.5 });
      const rx = Math.floor(p.x);
      const ry = Math.floor(p.y);
      if (rx >= 0 && ry >= 0 && rx < roof.width && ry < roof.height) {
        data[y * frameWidth + x] = roof.data[ry * roof.width + rx];
      }
    }
  }
  return { width: frameWidth, height: frameHeight, data };
}

/** Builds an RGBA test frame: blue sky on top, grey wall below, red roof inside the box. */
export function colourScene(width: number, height: number, roofBox: { x0: number; y0: number; x1: number; y1: number }): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const inRoof = x >= roofBox.x0 && x < roofBox.x1 && y >= roofBox.y0 && y < roofBox.y1;
      if (inRoof) {
        const seam = y % 12 < 2 || x % 10 < 1 ? 50 : 0;
        data.set([170 - seam, 70 - seam / 2, 55 - seam / 2, 255], p);
      } else if (y < roofBox.y0) {
        data.set([150, 195, 240, 255], p);
      } else {
        data.set([215, 215, 210, 255], p);
      }
    }
  }
  return { width, height, data };
}
