// lib/tile-count/grid.ts
// Projects the counting grid and roof-plane rectangles back onto the photo, shared
// by the live overlay and the annotated export so both always show the same thing.
// PURE, DETERMINISTIC, no I/O.

import { coverWidthMm, exposedHeightMm } from "./dimensions";
import { applyHomography, computeHomography } from "./homography";
import type { PlacedPanel } from "./panels";
import { rectangleQuad } from "./rectify";
import type { Obstruction, Point, Quad, TileSize } from "./types";

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

/** Photo outline of a rectangle given in tile units, measured from the bottom-left corner. */
function tileRectOutline(
  left: number,
  bottom: number,
  width: number,
  height: number,
  quad: Quad,
  rows: number,
  columns: number,
): Quad | null {
  const toPhoto = computeHomography(rectangleQuad(columns, rows), quad);
  if (!toPhoto) return null;
  const y0 = rows - bottom - height;
  const y1 = rows - bottom;
  return [
    applyHomography(toPhoto, { x: left, y: y0 }),
    applyHomography(toPhoto, { x: left + width, y: y0 }),
    applyHomography(toPhoto, { x: left + width, y: y1 }),
    applyHomography(toPhoto, { x: left, y: y1 }),
  ];
}

export function obstructionOutline(
  obstruction: Obstruction,
  quad: Quad,
  rows: number,
  columns: number,
): Quad | null {
  const { fromLeft, fromBottom, widthTiles, heightTiles } = obstruction;
  return tileRectOutline(fromLeft, fromBottom, widthTiles, heightTiles, quad, rows, columns);
}

/** Photo outline of a panel. The tile size converts its millimetres to tile units. */
export function panelOutline(
  panel: PlacedPanel,
  size: TileSize,
  quad: Quad,
  rows: number,
  columns: number,
): Quad | null {
  const cover = coverWidthMm(size);
  const exposed = exposedHeightMm(size);
  return tileRectOutline(
    panel.xMm / cover,
    panel.yMm / exposed,
    panel.widthMm / cover,
    panel.heightMm / exposed,
    quad,
    rows,
    columns,
  );
}
