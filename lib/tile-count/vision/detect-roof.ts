// lib/tile-count/vision/detect-roof.ts
// First guess at the roof corners, for the employee to correct. This is a colour
// heuristic, not a segmentation model: neighbouring roofs of the same colour will
// fool it. RoofDetector is the seam for swapping in a real model later.
// PURE, DETERMINISTIC, no I/O.

import type { Point, Quad, RgbaImage } from "../types";

export interface RoofDetection {
  quad: Quad;
  /** 0..1 */
  confidence: number;
}

export interface RoofDetector {
  detect(image: RgbaImage): RoofDetection;
}

/** Analysis grid along the long edge of the photo. */
const GRID_CELLS = 64;
/** The roof must fill this share of the photo for the guess to be trusted. */
const MIN_COVERAGE = 0.08;

/** Red, or dark with little colour: the two tile families in the briefing. */
function looksLikeTile(r: number, g: number, b: number): boolean {
  const reddish = r > g * 1.2 && r > b * 1.2;
  const darkNeutral = Math.max(r, g, b) < 110 && Math.max(r, g, b) - Math.min(r, g, b) < 40;
  return reddish || darkNeutral;
}

function tileMask(image: RgbaImage, cellSize: number, cols: number, rows: number): Uint8Array {
  const { width, height, data } = image;
  const mask = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let hits = 0;
      let samples = 0;
      const yEnd = Math.min(height, (row + 1) * cellSize);
      const xEnd = Math.min(width, (col + 1) * cellSize);
      for (let y = row * cellSize; y < yEnd; y += 2) {
        for (let x = col * cellSize; x < xEnd; x += 2) {
          const p = (y * width + x) * 4;
          if (looksLikeTile(data[p], data[p + 1], data[p + 2])) hits++;
          samples++;
        }
      }
      if (samples > 0 && hits / samples > 0.6) mask[row * cols + col] = 1;
    }
  }
  return mask;
}

/** Cells of the largest 4-connected region, so a small neighbouring roof is dropped. */
function largestRegion(mask: Uint8Array, cols: number, rows: number): number[] {
  const seen = new Uint8Array(mask.length);
  let best: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const region: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const cell = stack.pop()!;
      region.push(cell);
      const col = cell % cols;
      const neighbours = [
        col > 0 ? cell - 1 : -1,
        col < cols - 1 ? cell + 1 : -1,
        cell - cols,
        cell + cols < mask.length ? cell + cols : -1,
      ];
      for (const next of neighbours) {
        if (next >= 0 && mask[next] && !seen[next]) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (region.length > best.length) best = region;
  }
  return rows > 0 ? best : [];
}

/** Region corners: the cells furthest along each diagonal. */
function cornersOf(region: number[], cols: number, cellSize: number): Quad {
  const points: Point[] = region.map((cell) => ({
    x: ((cell % cols) + 0.5) * cellSize,
    y: (Math.floor(cell / cols) + 0.5) * cellSize,
  }));
  const pick = (score: (p: Point) => number) =>
    points.reduce((best, p) => (score(p) > score(best) ? p : best), points[0]);
  return [
    pick((p) => -p.x - p.y),
    pick((p) => p.x - p.y),
    pick((p) => p.x + p.y),
    pick((p) => -p.x + p.y),
  ];
}

/** Inset rectangle, used when nothing roof-like is found. */
function fallbackQuad(width: number, height: number): Quad {
  const dx = width * 0.15;
  const dy = height * 0.15;
  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ];
}

export const heuristicRoofDetector: RoofDetector = {
  detect(image) {
    const { width, height } = image;
    const cellSize = Math.max(1, Math.floor(Math.max(width, height) / GRID_CELLS));
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const region = largestRegion(tileMask(image, cellSize, cols, rows), cols, rows);

    const coverage = region.length / (cols * rows);
    if (coverage < MIN_COVERAGE) return { quad: fallbackQuad(width, height), confidence: 0 };
    return { quad: cornersOf(region, cols, cellSize), confidence: Math.min(1, coverage * 2) };
  },
};
