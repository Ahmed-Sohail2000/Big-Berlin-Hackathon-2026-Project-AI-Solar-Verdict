// lib/tile-count/types.ts
// Shared types for the roof tile counting pipeline. See docs/ROOF_TILE_COUNTING.md.

export interface Point {
  x: number;
  y: number;
}

/** Roof corners in photo pixels, clockwise: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point];

/** Single-channel image with luminance in the range 0..1. */
export interface GrayImage {
  width: number;
  height: number;
  data: Float32Array;
}

/** Pixels in canvas ImageData layout (RGBA, 8 bits per channel). */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Tile dimensions entered by the employee, in millimetres. */
export interface TileSize {
  heightMm: number;
  widthMm: number;
  /** Overlap between courses. Ignored when rowSpacingMm is set. */
  headLapMm: number;
  /** Overlap between neighbouring tiles in a course. */
  sideLapMm: number;
  /** Exposed course height (batten gauge), when known directly. */
  rowSpacingMm?: number;
}

export interface RoofDimensions {
  heightM: number;
  widthM: number;
  areaM2: number;
  exposedHeightMm: number;
  coverWidthMm: number;
}

export type ConfidenceLevel = "high" | "medium" | "low";

/** Periodicity measurement along one axis of the rectified roof. */
export interface AxisMeasurement {
  /** Tiles along this axis, or null when no repeating pattern was found. */
  count: number | null;
  /** Unrounded extent / period. Null when no pattern was found. */
  rawCount: number | null;
  periodPx: number | null;
  /** 0..1 */
  confidence: number;
}

export interface TileCountResult {
  /** Courses from eave to ridge ("tiles high"). */
  rows: AxisMeasurement;
  /** Tiles per course ("tiles wide"). */
  columns: AxisMeasurement;
  /** 0..1, the weaker axis decides. */
  confidence: number;
  level: ConfidenceLevel;
  /** Plain-language problems the employee must see before trusting the count. */
  warnings: string[];
  rectifiedWidth: number;
  rectifiedHeight: number;
}

export type ObstructionKind =
  | "roof_window"
  | "chimney"
  | "exhaust_pipe"
  | "dormer"
  | "satellite_dish"
  | "other";

/** Obstruction position in whole tiles, e.g. "10 from bottom, 20 from left, 4 wide, 5 high". */
export interface Obstruction {
  id: string;
  kind: ObstructionKind;
  fromBottom: number;
  fromLeft: number;
  widthTiles: number;
  heightTiles: number;
  /** True while it is an unconfirmed automatic proposal. */
  proposed: boolean;
}
