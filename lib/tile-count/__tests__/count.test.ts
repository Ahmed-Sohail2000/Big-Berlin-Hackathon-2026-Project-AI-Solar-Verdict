import { describe, expect, it } from "vitest";
import { countTiles } from "../count";
import { applyHomography, computeHomography, isValidQuad } from "../homography";
import { rectangleQuad, rectify, toGray } from "../rectify";
import type { Quad } from "../types";
import { photographRoof, renderNoise, renderRoof } from "./synthetic-roof";

/** Oblique view from below: the eave is wide, the ridge narrow and foreshortened. */
const OBLIQUE: Quad = [
  { x: 260, y: 120 },
  { x: 940, y: 140 },
  { x: 1140, y: 720 },
  { x: 70, y: 700 },
];

describe("homography", () => {
  it("maps each corner onto its target", () => {
    const dst = rectangleQuad(800, 500);
    const h = computeHomography(OBLIQUE, dst);
    expect(h).not.toBeNull();
    OBLIQUE.forEach((corner, i) => {
      const mapped = applyHomography(h!, corner);
      expect(mapped.x).toBeCloseTo(dst[i].x, 6);
      expect(mapped.y).toBeCloseTo(dst[i].y, 6);
    });
  });

  it("rejects collapsed corners", () => {
    const line: Quad = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    expect(computeHomography(line, rectangleQuad(10, 10))).toBeNull();
  });

  it("accepts a convex quad and rejects a crossed one", () => {
    expect(isValidQuad(OBLIQUE)).toBe(true);
    const [tl, tr, br, bl] = OBLIQUE;
    expect(isValidQuad([tl, br, tr, bl])).toBe(false);
  });
});

describe("rectify", () => {
  it("returns the original image for an identity quad", () => {
    const roof = renderRoof({ rows: 4, columns: 4 });
    const flat = rectify(roof, rectangleQuad(roof.width, roof.height), roof.width, roof.height);
    expect(flat).not.toBeNull();
    for (let i = 0; i < roof.data.length; i += 97) {
      expect(flat!.data[i]).toBeCloseTo(roof.data[i], 4);
    }
  });

  it("converts RGBA to luminance", () => {
    const gray = toGray({
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]),
    });
    expect(gray.data[0]).toBeCloseTo(1, 5);
    expect(gray.data[1]).toBeCloseTo(0, 5);
  });
});

describe("countTiles", () => {
  it("counts a front-on roof exactly", () => {
    const roof = renderRoof({ rows: 30, columns: 60 });
    const result = countTiles(roof, rectangleQuad(roof.width, roof.height));
    expect(result.rows.count).toBe(30);
    expect(result.columns.count).toBe(60);
    expect(result.level).toBe("high");
  });

  it("counts an unstaggered roof", () => {
    const roof = renderRoof({ rows: 20, columns: 40, staggered: false });
    const result = countTiles(roof, rectangleQuad(roof.width, roof.height));
    expect(result.rows.count).toBe(20);
    expect(result.columns.count).toBe(40);
  });

  it("corrects an oblique phone perspective", () => {
    const roof = renderRoof({ rows: 28, columns: 52 });
    const photo = photographRoof(roof, OBLIQUE, 1200, 800);
    const result = countTiles(photo, OBLIQUE);
    expect(result.rows.count).toBe(28);
    expect(result.columns.count).toBe(52);
  });

  it("is not thrown off by moss, a shadow and sensor noise", () => {
    const roof = renderRoof({ rows: 26, columns: 48, moss: 12, shadow: true, noise: 0.12, seed: 3 });
    const photo = photographRoof(roof, OBLIQUE, 1200, 800);
    const result = countTiles(photo, OBLIQUE);
    expect(result.rows.count).toBe(26);
    expect(result.columns.count).toBe(48);
  });

  it("gives the same answer on every run", () => {
    const roof = renderRoof({ rows: 18, columns: 33, noise: 0.05 });
    const quad = rectangleQuad(roof.width, roof.height);
    expect(countTiles(roof, quad)).toEqual(countTiles(roof, quad));
  });

  it("warns instead of reporting a confident number on a patternless photo", () => {
    const noise = renderNoise(900, 600);
    const result = countTiles(noise, rectangleQuad(900, 600));
    expect(result.level).toBe("low");
    expect(result.warnings.join(" ")).toContain("Tile boundaries not reliably detectable");
  });

  it("warns when the corners are wrong enough to bend the grid", () => {
    const roof = renderRoof({ rows: 28, columns: 52 });
    const photo = photographRoof(roof, OBLIQUE, 1200, 800);
    const shifted: Quad = [
      { x: 330, y: 200 },
      OBLIQUE[1],
      OBLIQUE[2],
      OBLIQUE[3],
    ];
    const result = countTiles(photo, shifted);
    expect(result.level).not.toBe("high");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("refuses a crossed quad", () => {
    const roof = renderRoof({ rows: 6, columns: 6 });
    const [tl, tr, br, bl] = rectangleQuad(roof.width, roof.height);
    const result = countTiles(roof, [tl, br, tr, bl]);
    expect(result.rows.count).toBeNull();
    expect(result.level).toBe("low");
  });
});
