// lib/tile-count/obstructions.ts
// Proposes obstruction areas by finding grid cells that do not look like a tile,
// and converts them to tile positions. Cells are compared by structure (normalised
// correlation), so moss and shadow, which only change brightness, are not flagged.
// The kind of obstruction is not recognised; the employee assigns it.
// PURE, DETERMINISTIC, no I/O.

import type { GrayImage, Obstruction } from "./types";

/** A cell correlating below this with the typical tile is an anomaly. */
const MAX_TILE_CORRELATION = 0.35;
/** Smaller clusters are more likely dirt or a broken tile than an obstruction. */
const MIN_CELLS = 2;
/** Normalised cells are compared at this fixed size. */
const CELL_SAMPLES = 12;

/** Resamples one grid cell to a fixed size with zero mean and unit length. Null if flat. */
function normalisedCell(
  image: GrayImage,
  row: number,
  column: number,
  rows: number,
  columns: number,
): Float32Array | null {
  const cell = new Float32Array(CELL_SAMPLES * CELL_SAMPLES);
  const cellWidth = image.width / columns;
  const cellHeight = image.height / rows;
  let mean = 0;
  for (let y = 0; y < CELL_SAMPLES; y++) {
    for (let x = 0; x < CELL_SAMPLES; x++) {
      const px = Math.floor((column + (x + 0.5) / CELL_SAMPLES) * cellWidth);
      const py = Math.floor((row + (y + 0.5) / CELL_SAMPLES) * cellHeight);
      const value = image.data[py * image.width + px];
      cell[y * CELL_SAMPLES + x] = value;
      mean += value;
    }
  }
  mean /= cell.length;
  let energy = 0;
  for (let i = 0; i < cell.length; i++) {
    cell[i] -= mean;
    energy += cell[i] * cell[i];
  }
  if (energy < 1e-4) return null;
  const norm = Math.sqrt(energy);
  for (let i = 0; i < cell.length; i++) cell[i] /= norm;
  return cell;
}

function correlation(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** Bounding boxes of 8-connected anomalous cells, as [row0, col0, row1, col1]. */
function clusters(anomaly: Uint8Array, rows: number, columns: number): number[][] {
  const seen = new Uint8Array(anomaly.length);
  const boxes: number[][] = [];
  for (let start = 0; start < anomaly.length; start++) {
    if (!anomaly[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let size = 0;
    let [minRow, minCol, maxRow, maxCol] = [rows, columns, 0, 0];
    while (stack.length > 0) {
      const cell = stack.pop()!;
      size++;
      const row = Math.floor(cell / columns);
      const col = cell % columns;
      minRow = Math.min(minRow, row);
      minCol = Math.min(minCol, col);
      maxRow = Math.max(maxRow, row);
      maxCol = Math.max(maxCol, col);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const r = row + dy;
          const c = col + dx;
          if (r < 0 || c < 0 || r >= rows || c >= columns) continue;
          const next = r * columns + c;
          if (anomaly[next] && !seen[next]) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    if (size >= MIN_CELLS) boxes.push([minRow, minCol, maxRow, maxCol]);
  }
  return boxes;
}

/**
 * Finds unconfirmed obstruction proposals on the rectified roof. Each row parity
 * gets its own average tile, because staggered courses are offset by half a tile.
 */
export function proposeObstructions(flat: GrayImage, rows: number, columns: number): Obstruction[] {
  const templates = [
    new Float32Array(CELL_SAMPLES * CELL_SAMPLES),
    new Float32Array(CELL_SAMPLES * CELL_SAMPLES),
  ];
  const cells: (Float32Array | null)[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cell = normalisedCell(flat, row, col, rows, columns);
      cells.push(cell);
      if (cell) {
        const template = templates[row % 2];
        for (let i = 0; i < cell.length; i++) template[i] += cell[i];
      }
    }
  }
  for (const template of templates) {
    const norm = Math.sqrt(correlation(template, template));
    if (norm > 0) for (let i = 0; i < template.length; i++) template[i] /= norm;
  }

  const anomaly = new Uint8Array(rows * columns);
  cells.forEach((cell, index) => {
    const row = Math.floor(index / columns);
    if (!cell || correlation(cell, templates[row % 2]) < MAX_TILE_CORRELATION) anomaly[index] = 1;
  });

  return clusters(anomaly, rows, columns).map(([r0, c0, r1, c1], i) => ({
    id: `proposal-${i + 1}`,
    kind: "other",
    fromBottom: rows - 1 - r1,
    fromLeft: c0,
    widthTiles: c1 - c0 + 1,
    heightTiles: r1 - r0 + 1,
    proposed: true,
  }));
}

/** Same phrasing as the briefing, for exports and the results table. */
export function describeObstruction(o: Obstruction): string {
  return `${o.fromBottom} tiles from the bottom, ${o.fromLeft} from the left, ${o.widthTiles} wide, ${o.heightTiles} high`;
}

/** Returns a problem with an obstruction that does not fit on the counted roof, if any. */
export function validateObstruction(o: Obstruction, rows: number, columns: number): string | null {
  const whole = [o.fromBottom, o.fromLeft, o.widthTiles, o.heightTiles].every(
    (n) => Number.isInteger(n) && n >= 0,
  );
  if (!whole || o.widthTiles === 0 || o.heightTiles === 0) {
    return "Position and size must be whole numbers of tiles.";
  }
  if (o.fromLeft + o.widthTiles > columns || o.fromBottom + o.heightTiles > rows) {
    return "This area extends past the counted roof.";
  }
  return null;
}
