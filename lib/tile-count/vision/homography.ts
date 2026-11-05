// lib/tile-count/vision/homography.ts
// Four-point planar homography. PURE, DETERMINISTIC, no I/O.

import type { Point, Quad } from "../types";

/** 3x3 matrix in row order. */
export type Homography = [
  number, number, number,
  number, number, number,
  number, number, number,
];

/** Solves Ax = b by Gaussian elimination with partial pivoting. Returns null if singular. */
function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-10) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];

    for (let r = col + 1; r < n; r++) {
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = m[r][n];
    for (let c = r + 1; c < n; c++) sum -= m[r][c] * x[c];
    x[r] = sum / m[r][r];
  }
  return x;
}

/**
 * Homography taking each src point onto the matching dst point (direct linear
 * transform with h33 fixed at 1). Returns null for degenerate input such as
 * three collinear corners.
 */
export function computeHomography(src: Quad, dst: Quad): Homography | null {
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(a, b);
  if (!h) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function applyHomography(h: Homography, p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / w,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / w,
  };
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * True when the corners form a convex quadrilateral with real area. A dragged
 * handle can cross the opposite edge; counting such a shape would be meaningless.
 */
export function isValidQuad(quad: Quad, minArea = 400): boolean {
  const turns = quad.map((p, i) => cross(p, quad[(i + 1) % 4], quad[(i + 2) % 4]));
  const sameTurn = turns.every((t) => t > 0) || turns.every((t) => t < 0);
  if (!sameTurn) return false;
  const area =
    Math.abs(
      quad.reduce((sum, p, i) => {
        const q = quad[(i + 1) % 4];
        return sum + p.x * q.y - q.x * p.y;
      }, 0),
    ) / 2;
  return area >= minArea;
}
