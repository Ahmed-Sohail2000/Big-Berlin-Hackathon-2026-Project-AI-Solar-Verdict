import { describe, expect, it } from "vitest";
import { countTiles } from "../vision/count";
import { rectangleQuad } from "../vision/rectify";
import { photographRoof, renderNoise, renderRoof } from "../testing/synthetic-roof";
import type { Point, Quad } from "../types";

/**
 * Known-answer benchmark across the briefing's three quality levels. It guards the
 * algorithm against regressions. These roofs are synthetic, so nothing here may be
 * quoted as accuracy on real photos.
 */
const ROOFS: [rows: number, columns: number][] = [
  [14, 24],
  [18, 33],
  [22, 40],
  [27, 52],
  [33, 61],
  [40, 72],
];

const OBLIQUE: Quad = [
  { x: 300, y: 90 },
  { x: 1000, y: 120 },
  { x: 1320, y: 800 },
  { x: 40, y: 760 },
];

const STEEP: Quad = [
  { x: 420, y: 150 },
  { x: 900, y: 170 },
  { x: 1340, y: 830 },
  { x: 30, y: 800 },
];

/** Moves opposite corners in opposite directions, which tilts the grid against the courses. */
function twisted(quad: Quad, by: Point): Quad {
  return quad.map((p, i) => ({ x: p.x + (i % 2 ? by.x : -by.x), y: p.y + (i < 2 ? -by.y : by.y) })) as Quad;
}

/** The number the employee would see: a low-confidence count stays blank. */
function shownError(result: ReturnType<typeof countTiles>, rows: number, columns: number): number | null {
  if (result.level === "low" || result.rows.count === null || result.columns.count === null) return null;
  return Math.max(Math.abs(result.rows.count - rows), Math.abs(result.columns.count - columns));
}

describe("accuracy benchmark on synthetic roofs", () => {
  it.each(ROOFS)("optimal: %i x %i, square-on, is exact and confident", (rows, columns) => {
    const roof = renderRoof({ rows, columns, noise: 0.04, seed: rows * 3 });
    const result = countTiles(roof, rectangleQuad(roof.width, roof.height));
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
    expect(result.level).toBe("high");
  });

  it.each(ROOFS)("acceptable: %i x %i, oblique with moss and shadow, is exact", (rows, columns) => {
    const roof = renderRoof({ rows, columns, moss: 8, shadow: true, noise: 0.1, seed: columns });
    const result = countTiles(photographRoof(roof, OBLIQUE, 1400, 880), OBLIQUE);
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
  });

  it.each(ROOFS)("poor: %i x %i, steep with heavy dirt, is still exact", (rows, columns) => {
    const roof = renderRoof({ rows, columns, moss: 25, shadow: true, noise: 0.3, seed: rows + columns });
    const result = countTiles(photographRoof(roof, STEEP, 1400, 900), STEEP);
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
  });

  // Blurred side joints are named in the briefing. The width cannot always be read
  // then, and the safe outcome is a blank field. A far-off number must never appear.
  describe.each([0.06, 0.03])("blurred side joints (contrast %f)", (jointContrast) => {
    it.each(ROOFS)("%i x %i is right or left blank, for several seeds", (rows, columns) => {
      for (let seed = 1; seed <= 4; seed++) {
        const roof = renderRoof({ rows, columns, moss: 8, noise: 0.15, jointContrast, seed: seed * 7 + rows });
        const error = shownError(countTiles(photographRoof(roof, STEEP, 1400, 900), STEEP), rows, columns);
        if (error !== null) expect(error).toBeLessThanOrEqual(1);
      }
    });
  });

  it.each(ROOFS)("tilted grid: %i x %i does not double the width", (rows, columns) => {
    const roof = renderRoof({ rows, columns, moss: 5, noise: 0.08, seed: rows });
    const photo = photographRoof(roof, OBLIQUE, 1400, 880);
    const result = countTiles(photo, twisted(OBLIQUE, { x: 4, y: 4 }));
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
  });

  it.each(ROOFS)("corners 3 px outside the roof: %i x %i is exact", (rows, columns) => {
    const roof = renderRoof({ rows, columns, moss: 5, noise: 0.08, seed: rows });
    const photo = photographRoof(roof, OBLIQUE, 1400, 880);
    const centre = { x: 670, y: 450 };
    const grown = OBLIQUE.map((p) => {
      const length = Math.hypot(p.x - centre.x, p.y - centre.y);
      return { x: p.x + ((p.x - centre.x) / length) * 3, y: p.y + ((p.y - centre.y) / length) * 3 };
    }) as Quad;
    const result = countTiles(photo, grown);
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
  });

  it("gives the same answer every time", () => {
    const roof = renderRoof({ rows: 22, columns: 40, moss: 6, noise: 0.1 });
    const photo = photographRoof(roof, OBLIQUE, 1400, 880);
    expect(countTiles(photo, OBLIQUE)).toEqual(countTiles(photo, OBLIQUE));
  });

  it.each([11, 22, 33])("never claims confidence on a photo with no tiles (seed %i)", (seed) => {
    const noise = renderNoise(1000, 700, seed);
    expect(countTiles(noise, rectangleQuad(1000, 700)).level).toBe("low");
  });
});
