// lib/tile-count/vision/count.ts
// Turns a photo plus roof corners into tile counts, a confidence level and
// warnings. A poor photo must produce a warning, never a confident wrong number.
// PURE, DETERMINISTIC, no I/O.

import { isValidQuad } from "./homography";
import {
  bandedAutocorrelation,
  courseBands,
  findPeriod,
  MIN_PERIOD_PX,
  type Axis,
  type Band,
  type PeriodEstimate,
} from "./periodicity";
import { rectifiedSize, rectify } from "./rectify";
import type {
  AxisMeasurement,
  ConfidenceLevel,
  GrayImage,
  Quad,
  TileCountResult,
} from "../types";

/** Strips across the roof when measuring course height. */
const ROW_BANDS = 12;
/**
 * A flattened tile wider than this many course heights is not a tile. Roof tiles are
 * about as wide as they are tall, and a photo facing the surface squashes little.
 * Above this, the width pattern has locked onto something else, usually because the
 * side joints are blurred. A rare false alarm only asks for a count by hand.
 */
const MAX_TILE_ASPECT = 2;
const IMPLAUSIBLE_CONFIDENCE = 0.3;

/** Width bands when no course pattern was found to align them with. */
const FALLBACK_COLUMN_BANDS = 60;
/** Period disagreement between two halves of the roof that scores zero. */
const MAX_DRIFT = 0.06;
/** Distance from a whole number above which the count is likely off by one. */
const MAX_FRACTION = 0.3;

const NO_PATTERN = "Tile boundaries not reliably detectable";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Relative period change between the two halves of the axis. Zero when a half is too short to judge. */
function periodDrift(image: GrayImage, axis: Axis, bands: number | Band[], period: number): number {
  const along = axis === "rows" ? image.height : image.width;
  const middle = Math.floor(along / 2);
  if (middle < period * 4) return 0;

  const lower = bandedAutocorrelation(image, axis, bands, 0, middle);
  const upper = bandedAutocorrelation(image, axis, bands, middle, along);
  if (!lower || !upper) return 0;
  const a = findPeriod(lower, middle, Math.max(MIN_PERIOD_PX, Math.floor(period * 0.7)));
  const b = findPeriod(upper, along - middle, Math.max(MIN_PERIOD_PX, Math.floor(period * 0.7)));
  if (!a || !b) return MAX_DRIFT;
  return Math.abs(a.periodPx - b.periodPx) / period;
}

function axisConfidence(estimate: PeriodEstimate, drift: number): number {
  const pattern = clamp01((estimate.contrast - 0.12) / 0.6);
  const consistency = clamp01(1 - drift / MAX_DRIFT);
  return clamp01(0.5 * pattern + 0.2 * estimate.harmonicSupport + 0.3 * consistency);
}

function measureAxis(image: GrayImage, axis: Axis, bands: number | Band[]): AxisMeasurement & { drift: number } {
  const extent = axis === "rows" ? image.height : image.width;
  const ac = bandedAutocorrelation(image, axis, bands);
  const estimate = ac ? findPeriod(ac, extent) : null;
  if (!estimate) return { count: null, rawCount: null, periodPx: null, confidence: 0, drift: 0 };

  const drift = periodDrift(image, axis, bands, estimate.periodPx);
  const rawCount = extent / estimate.periodPx;
  return {
    count: Math.max(1, Math.round(rawCount)),
    rawCount,
    periodPx: estimate.periodPx,
    confidence: axisConfidence(estimate, drift),
    drift,
  };
}

function levelFor(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return "high";
  return confidence >= 0.45 ? "medium" : "low";
}

function axisWarnings(label: string, axis: AxisMeasurement & { drift: number }): string[] {
  if (axis.count === null || axis.rawCount === null || axis.periodPx === null) {
    return [`${NO_PATTERN} (${label}). Count this axis by hand.`];
  }
  const warnings: string[] = [];
  if (axis.periodPx < MIN_PERIOD_PX * 2) {
    warnings.push(`Tiles are very small in this photo (${label}). Use a closer or sharper photo.`);
  }
  if (axis.drift >= MAX_DRIFT / 2) {
    warnings.push(
      `Tile spacing changes across the roof (${label}). Check the corner points, or the surface may not be a single plane.`,
    );
  }
  if (Math.abs(axis.rawCount - axis.count) > MAX_FRACTION) {
    warnings.push(
      `The roof edge does not land on a tile edge (${label}, measured ${axis.rawCount.toFixed(1)}). The count may be off by one.`,
    );
  }
  return warnings;
}

/** Counts tiles inside the employee-confirmed quad. The result is a proposal for human review. */
export function countTiles(image: GrayImage, quad: Quad): TileCountResult {
  const { width, height } = rectifiedSize(quad);
  const emptyAxis: AxisMeasurement = { count: null, rawCount: null, periodPx: null, confidence: 0 };
  const flat = isValidQuad(quad) ? rectify(image, quad, width, height) : null;
  if (!flat) {
    return {
      rows: emptyAxis,
      columns: emptyAxis,
      confidence: 0,
      level: "low",
      warnings: ["The corner points do not form a valid roof shape. Move them and recount."],
      rectifiedWidth: width,
      rectifiedHeight: height,
    };
  }

  const rows = measureAxis(flat, "rows", ROW_BANDS);
  // Height is the more reliable axis, so it decides where the width is measured.
  const bands = rows.periodPx ? courseBands(flat, rows.periodPx) : [];
  const columns = measureAxis(flat, "columns", bands.length > 0 ? bands : FALLBACK_COLUMN_BANDS);

  const aspect = rows.periodPx && columns.periodPx ? columns.periodPx / rows.periodPx : 0;
  const implausible = aspect > MAX_TILE_ASPECT;
  if (implausible) columns.confidence = Math.min(columns.confidence, IMPLAUSIBLE_CONFIDENCE);

  const confidence = Math.min(rows.confidence, columns.confidence);
  const level = levelFor(confidence);
  const warnings = [...axisWarnings("height", rows), ...axisWarnings("width", columns)];
  if (implausible) warnings.push("The side joints between tiles could not be followed. Count the width by hand.");
  if (level === "low" && !warnings.some((w) => w.startsWith(NO_PATTERN))) {
    warnings.unshift(`${NO_PATTERN}. Verify the grid against the photo before using this count.`);
  }

  return {
    rows: { count: rows.count, rawCount: rows.rawCount, periodPx: rows.periodPx, confidence: rows.confidence },
    columns: {
      count: columns.count,
      rawCount: columns.rawCount,
      periodPx: columns.periodPx,
      confidence: columns.confidence,
    },
    confidence,
    level,
    warnings,
    rectifiedWidth: width,
    rectifiedHeight: height,
  };
}
