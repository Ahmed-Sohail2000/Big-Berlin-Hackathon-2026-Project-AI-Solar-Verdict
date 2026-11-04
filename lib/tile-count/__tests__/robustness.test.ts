import { describe, expect, it } from "vitest";
import { countTiles } from "../count";
import { rectangleQuad } from "../rectify";
import type { Quad } from "../types";
import { photographRoof, renderRoof } from "./synthetic-roof";

const OBLIQUE: Quad = [
  { x: 300, y: 90 },
  { x: 1000, y: 120 },
  { x: 1320, y: 800 },
  { x: 40, y: 760 },
];

describe("counting across roof sizes", () => {
  const sizes: [number, number][] = [
    [12, 25],
    [17, 31],
    [22, 44],
    [31, 67],
    [45, 80],
  ];

  it.each(sizes)("counts %i x %i front-on with noise", (rows, columns) => {
    const roof = renderRoof({ rows, columns, noise: 0.1, seed: rows });
    const result = countTiles(roof, rectangleQuad(roof.width, roof.height));
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
  });

  it.each(sizes)("counts %i x %i in an oblique photo with moss and shadow", (rows, columns) => {
    const roof = renderRoof({ rows, columns, moss: 8, shadow: true, noise: 0.08, seed: columns });
    const photo = photographRoof(roof, OBLIQUE, 1400, 880);
    const result = countTiles(photo, OBLIQUE);
    expect([result.rows.count, result.columns.count]).toEqual([rows, columns]);
  });

  it("stays correct with small tiles", () => {
    const roof = renderRoof({ rows: 40, columns: 70, tileWidthPx: 12, tileHeightPx: 14 });
    const result = countTiles(roof, rectangleQuad(roof.width, roof.height));
    expect([result.rows.count, result.columns.count]).toEqual([40, 70]);
  });
});
