// lib/tile-count/dimensions.ts
// Outer roof dimensions from tile counts and the tile size. Rows use the exposed
// height, not the full tile length, because courses overlap.
// PURE, DETERMINISTIC, no I/O.

import type { Point, RoofDimensions, TileSize } from "./types";

/** Exposed height of one course in millimetres. */
export function exposedHeightMm(size: TileSize): number {
  return size.rowSpacingMm ?? size.heightMm - size.headLapMm;
}

export function coverWidthMm(size: TileSize): number {
  return size.widthMm - size.sideLapMm;
}

/** Returns human-readable problems with the tile size; empty means it is usable. */
export function validateTileSize(size: TileSize): string[] {
  const errors: string[] = [];
  if (!(size.heightMm > 0)) errors.push("Enter the tile height.");
  if (!(size.widthMm > 0)) errors.push("Enter the tile width.");
  if (!(size.headLapMm >= 0)) errors.push("Overlap cannot be negative.");
  if (!(size.sideLapMm >= 0)) errors.push("Side overlap cannot be negative.");
  if (size.rowSpacingMm !== undefined && !(size.rowSpacingMm > 0)) {
    errors.push("Row spacing must be greater than zero.");
  }
  if (errors.length === 0 && exposedHeightMm(size) <= 0) {
    errors.push("Overlap must be smaller than the tile height.");
  }
  if (errors.length === 0 && coverWidthMm(size) <= 0) {
    errors.push("Side overlap must be smaller than the tile width.");
  }
  return errors;
}

export function computeDimensions(
  rows: number,
  columns: number,
  size: TileSize,
): RoofDimensions {
  const exposed = exposedHeightMm(size);
  const cover = coverWidthMm(size);
  const heightM = (rows * exposed) / 1000;
  const widthM = (columns * cover) / 1000;
  return {
    heightM: Math.round(heightM * 1000) / 1000,
    widthM: Math.round(widthM * 1000) / 1000,
    areaM2: Math.round(heightM * widthM * 100) / 100,
    exposedHeightMm: exposed,
    coverWidthMm: cover,
  };
}

/**
 * Length between two clicked points, scaled by a ruler section of known length in
 * the same photo. Assumes the tile and ruler lie in one plane facing the camera.
 */
export function measureWithRuler(
  rulerStart: Point,
  rulerEnd: Point,
  rulerLengthMm: number,
  start: Point,
  end: Point,
): number | null {
  const rulerPx = Math.hypot(rulerEnd.x - rulerStart.x, rulerEnd.y - rulerStart.y);
  if (rulerPx === 0 || !(rulerLengthMm > 0)) return null;
  const lengthPx = Math.hypot(end.x - start.x, end.y - start.y);
  return Math.round((lengthPx * rulerLengthMm) / rulerPx);
}
