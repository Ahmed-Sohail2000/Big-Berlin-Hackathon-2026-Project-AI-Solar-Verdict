// lib/tile-count/planning/dimensions.ts
// Outer roof dimensions from tile counts and the tile size. Rows use the exposed
// height, not the full tile length, because courses overlap.
// PURE, DETERMINISTIC, no I/O.

import type { Point, RoofDimensions, TileSize } from "../types";

/** Exposed tile dimensions outside this range are almost certainly a typing slip. */
const MIN_PLAUSIBLE_MM = 100;
const MAX_PLAUSIBLE_MM = 600;

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
  // A blank overlap must not quietly become zero: that overstates the roof height.
  if (size.rowSpacingMm === undefined && !(size.headLapMm >= 0)) {
    errors.push("Enter the overlap, or the row spacing.");
  }
  if (!(size.sideLapMm >= 0)) errors.push("Enter the side overlap, or 0 if there is none.");
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

/**
 * Values that are possible but unusual for a roof tile, which usually means a
 * typing or unit slip such as centimetres. These warn; they do not block.
 */
export function tileSizeWarnings(size: TileSize): string[] {
  const inRange = (mm: number) => mm >= MIN_PLAUSIBLE_MM && mm <= MAX_PLAUSIBLE_MM;
  const warnings: string[] = [];
  if (!inRange(exposedHeightMm(size))) {
    warnings.push(`An exposed height of ${exposedHeightMm(size)} mm is unusual. Check that the values are in millimetres.`);
  }
  if (!inRange(coverWidthMm(size))) {
    warnings.push(`A cover width of ${coverWidthMm(size)} mm is unusual. Check that the values are in millimetres.`);
  }
  return warnings;
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
