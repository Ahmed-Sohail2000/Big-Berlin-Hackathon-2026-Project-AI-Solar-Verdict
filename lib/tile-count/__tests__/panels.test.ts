import { describe, expect, it } from "vitest";
import { panelOutline } from "../vision/grid";
import { DEFAULT_LAYOUT, PANEL_PRESETS, recommendPanels, validatePanelInputs, type PanelSpec } from "../planning/panels";
import { rectangleQuad } from "../vision/rectify";
import type { Obstruction, TileSize } from "../types";

/** 300 x 300 mm cover makes tile counts easy to convert: 30 tiles = 9 m. */
const TILE: TileSize = { heightMm: 370, widthMm: 330, headLapMm: 70, sideLapMm: 30 };
const PANEL: PanelSpec = { name: "Test", lengthMm: 1762, widthMm: 1134, wattsPeak: 440 };
const NO_MARGINS = { edgeSetbackMm: 0, panelGapMm: 0, obstructionClearanceMm: 0 };

const area = (fromBottom: number, fromLeft: number, widthTiles: number, heightTiles: number): Obstruction => ({
  id: "o",
  kind: "chimney",
  fromBottom,
  fromLeft,
  widthTiles,
  heightTiles,
  proposed: false,
});

describe("recommendPanels", () => {
  it("fills a clear roof by simple division", () => {
    // 9 m x 6 m: portrait 7 x 3 = 21, landscape 5 x 5 = 25.
    const result = recommendPanels(20, 30, TILE, [], PANEL, NO_MARGINS);
    expect(result.orientation).toBe("landscape");
    expect(result.count).toBe(25);
    expect(result.alternative).toEqual({ orientation: "portrait", count: 21 });
    expect(result.systemKwp).toBe(11);
  });

  it("loses panels to the edge setback and gaps", () => {
    const margins = recommendPanels(20, 30, TILE, [], PANEL, DEFAULT_LAYOUT);
    expect(margins.count).toBeLessThan(25);
    for (const p of margins.panels) {
      expect(p.xMm).toBeGreaterThanOrEqual(300);
      expect(p.yMm).toBeGreaterThanOrEqual(300);
      expect(p.xMm + p.widthMm).toBeLessThanOrEqual(30 * 300 - 300);
      expect(p.yMm + p.heightMm).toBeLessThanOrEqual(20 * 300 - 300);
    }
  });

  it("never places a panel on an obstruction or its clearance", () => {
    const chimney = area(8, 12, 4, 4);
    const result = recommendPanels(20, 30, TILE, [chimney], PANEL, DEFAULT_LAYOUT);
    const blocked = { x0: 3400, y0: 2200, x1: 5000, y1: 3800 };
    expect(result.count).toBeGreaterThan(0);
    expect(result.count).toBeLessThan(recommendPanels(20, 30, TILE, [], PANEL, DEFAULT_LAYOUT).count);
    for (const p of result.panels) {
      const overlaps =
        p.xMm < blocked.x1 && p.xMm + p.widthMm > blocked.x0 && p.yMm < blocked.y1 && p.yMm + p.heightMm > blocked.y0;
      expect(overlaps).toBe(false);
    }
  });

  it("returns no panels on a roof too small for one", () => {
    const result = recommendPanels(3, 3, TILE, [], PANEL, DEFAULT_LAYOUT);
    expect(result.count).toBe(0);
    expect(result.systemKwp).toBe(0);
  });

  it("is deterministic", () => {
    const run = () => recommendPanels(25, 41, TILE, [area(3, 4, 3, 3)], PANEL_PRESETS[1]);
    expect(run()).toEqual(run());
  });

  it("projects a panel onto the photo from the bottom-left corner", () => {
    const outline = panelOutline(
      { xMm: 0, yMm: 0, widthMm: 1500, heightMm: 600 },
      TILE,
      rectangleQuad(1000, 500),
      10,
      20,
    );
    expect(outline![0].x).toBeCloseTo(0, 6);
    expect(outline![0].y).toBeCloseTo(400, 6);
    expect(outline![2].x).toBeCloseTo(250, 6);
    expect(outline![2].y).toBeCloseTo(500, 6);
  });
});

describe("validatePanelInputs", () => {
  it("accepts the presets and defaults", () => {
    for (const preset of PANEL_PRESETS) expect(validatePanelInputs(preset, DEFAULT_LAYOUT)).toEqual([]);
  });

  it("rejects unusable values", () => {
    expect(validatePanelInputs({ ...PANEL, lengthMm: 0 }, DEFAULT_LAYOUT)).toHaveLength(1);
    expect(validatePanelInputs({ ...PANEL, wattsPeak: Number.NaN }, DEFAULT_LAYOUT)).toHaveLength(1);
    expect(validatePanelInputs(PANEL, { ...DEFAULT_LAYOUT, panelGapMm: -1 })).toHaveLength(1);
  });
});
