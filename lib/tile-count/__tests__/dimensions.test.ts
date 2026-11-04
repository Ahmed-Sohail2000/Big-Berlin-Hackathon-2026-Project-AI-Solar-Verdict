import { describe, expect, it } from "vitest";
import {
  computeDimensions,
  coverWidthMm,
  exposedHeightMm,
  measureWithRuler,
  validateTileSize,
} from "../dimensions";
import type { TileSize } from "../types";

const TILE: TileSize = { heightMm: 420, widthMm: 330, headLapMm: 70, sideLapMm: 30 };

describe("dimensions", () => {
  it("uses exposed height and cover width", () => {
    expect(exposedHeightMm(TILE)).toBe(350);
    expect(coverWidthMm(TILE)).toBe(300);
    const result = computeDimensions(30, 60, TILE);
    expect(result.heightM).toBe(10.5);
    expect(result.widthM).toBe(18);
    expect(result.areaM2).toBe(189);
  });

  it("prefers a directly entered row spacing over the overlap", () => {
    expect(exposedHeightMm({ ...TILE, rowSpacingMm: 340 })).toBe(340);
  });

  it("accepts a sensible tile size", () => {
    expect(validateTileSize(TILE)).toEqual([]);
  });

  it("rejects missing or impossible sizes", () => {
    expect(validateTileSize({ ...TILE, heightMm: 0 })).toContain("Enter the tile height.");
    expect(validateTileSize({ ...TILE, widthMm: Number.NaN })).toContain("Enter the tile width.");
    expect(validateTileSize({ ...TILE, headLapMm: 500 })).toContain(
      "Overlap must be smaller than the tile height.",
    );
    expect(validateTileSize({ ...TILE, sideLapMm: 400 })).toContain(
      "Side overlap must be smaller than the tile width.",
    );
    expect(validateTileSize({ ...TILE, rowSpacingMm: -1 })).toContain(
      "Row spacing must be greater than zero.",
    );
  });
});

describe("measureWithRuler", () => {
  it("scales a clicked length by the ruler", () => {
    const length = measureWithRuler(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      100,
      { x: 10, y: 10 },
      { x: 10, y: 850 },
    );
    expect(length).toBe(420);
  });

  it("returns null for an unusable ruler", () => {
    expect(measureWithRuler({ x: 5, y: 5 }, { x: 5, y: 5 }, 100, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
    expect(measureWithRuler({ x: 0, y: 0 }, { x: 9, y: 0 }, 0, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
});
