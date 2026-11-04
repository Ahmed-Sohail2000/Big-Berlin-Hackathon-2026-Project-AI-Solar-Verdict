// lib/tile-count/grid.ts
// Projects the counting grid and tile positions back onto the photo, shared by
// the live overlay and the annotated export so both always show the same thing.
// PURE, DETERMINISTIC, no I/O.

import { applyHomography, computeHomography } from "./homography";
import { rectangleQuad } from "./rectify";
import type { Obstruction, Point, Quad } from "./types";

export interface LineSegment {
  from: Point;
  to: Point;
}

/** Inner grid lines in photo pixels. A straight line stays straight under a homography. */
export function gridLines(quad: Quad, rows: number, columns: number): LineSegment[] {
  const toPhoto = computeHomography(rectangleQuad(columns, rows), quad);
  if (!toPhoto) return [];
  const lines: LineSegment[] = [];
  for (let r = 1; r < rows; r++) {
    lines.push({
      from: applyHomography(toPhoto, { x: 0, y: r }),
      to: applyHomography(toPhoto, { x: columns, y: r }),
    });
  }
  for (let c = 1; c < columns; c++) {
    lines.push({
      from: applyHomography(toPhoto, { x: c, y: 0 }),
      to: applyHomography(toPhoto, { x: c, y: rows }),
    });
  }
  return lines;
}

/** Outline of an obstruction in photo pixels, or null if the quad is degenerate. */
export function obstructionOutline(
  obstruction: Obstruction,
  quad: Quad,
  rows: number,
  columns: number,
): Quad | null {
  const toPhoto = computeHomography(rectangleQuad(columns, rows), quad);
  if (!toPhoto) return null;
  const top = rows - obstruction.fromBottom - obstruction.heightTiles;
  const bottom = rows - obstruction.fromBottom;
  const left = obstruction.fromLeft;
  const right = left + obstruction.widthTiles;
  return [
    applyHomography(toPhoto, { x: left, y: top }),
    applyHomography(toPhoto, { x: right, y: top }),
    applyHomography(toPhoto, { x: right, y: bottom }),
    applyHomography(toPhoto, { x: left, y: bottom }),
  ];
}
