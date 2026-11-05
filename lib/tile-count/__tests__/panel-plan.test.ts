import { describe, expect, it } from "vitest";
import { invalidPanelIds, panelAt, placementProblem, placePanel, snapToTiles, summarisePlan, describePanel, type RoofContext } from "../planning/panel-plan";
import { DEFAULT_LAYOUT, recommendPanels, type PanelSpec } from "../planning/panels";
import { panelOutline, tileAt } from "../vision/grid";
import type { Obstruction, Quad, TileSize } from "../types";

/** 300 x 300 mm cover: 30 tiles = 9 m. */
const TILE: TileSize = { heightMm: 370, widthMm: 330, headLapMm: 70, sideLapMm: 30 };
const PANEL: PanelSpec = { name: "Test", lengthMm: 1800, widthMm: 1200, wattsPeak: 400 };
const ROOF: RoofContext = { rows: 20, columns: 30, size: TILE, obstructions: [], options: DEFAULT_LAYOUT };

const panel = (fromLeft: number, fromBottom: number, orientation: "portrait" | "landscape" = "portrait") =>
  placePanel({ fromLeft, fromBottom, orientation }, PANEL, TILE);

describe("placePanel", () => {
  it("converts tile positions to millimetres and honours orientation", () => {
    expect(panel(2, 3)).toEqual({ xMm: 600, yMm: 900, widthMm: 1200, heightMm: 1800 });
    expect(panel(2, 3, "landscape")).toMatchObject({ widthMm: 1800, heightMm: 1200 });
  });
});

describe("snapToTiles", () => {
  it("centres on the click and lands on a whole tile", () => {
    // 1200 x 1800 mm is 4 x 6 tiles, so a click at (10, 10) gives corner (8, 7).
    expect(snapToTiles({ fromLeft: 10.2, fromBottom: 9.8 }, "portrait", PANEL, ROOF)).toEqual({
      fromLeft: 8,
      fromBottom: 7,
      orientation: "portrait",
    });
  });

  it("keeps the panel on the roof near an edge", () => {
    expect(snapToTiles({ fromLeft: 29.9, fromBottom: 19.9 }, "portrait", PANEL, ROOF)).toMatchObject({
      fromLeft: 26,
      fromBottom: 14,
    });
    expect(snapToTiles({ fromLeft: 0, fromBottom: 0 }, "portrait", PANEL, ROOF)).toMatchObject({
      fromLeft: 0,
      fromBottom: 0,
    });
  });
});

describe("placementProblem", () => {
  it("accepts a clear position", () => {
    expect(placementProblem(panel(2, 2), [], ROOF)).toBeNull();
  });

  it("enforces the edge distance on all sides", () => {
    expect(placementProblem(panel(0, 2), [], ROOF)).toContain("roof edge");
    expect(placementProblem(panel(2, 0), [], ROOF)).toContain("roof edge");
    expect(placementProblem(panel(26, 2), [], ROOF)).toContain("roof edge");
    expect(placementProblem(panel(2, 14), [], ROOF)).toContain("roof edge");
  });

  it("enforces the obstruction clearance", () => {
    const chimney: Obstruction = { id: "c", kind: "chimney", fromLeft: 8, fromBottom: 2, widthTiles: 2, heightTiles: 2, proposed: false };
    const context = { ...ROOF, obstructions: [chimney] };
    expect(placementProblem(panel(4, 2), [], context)).toContain("obstruction");
    expect(placementProblem(panel(3, 2), [], context)).toBeNull();
  });

  it("enforces the panel gap, and accepts exactly the gap", () => {
    const left = panel(2, 2);
    expect(placementProblem(panel(5, 2), [left], ROOF)).toContain("another panel");
    expect(placementProblem(panel(6, 2), [left], ROOF)).toContain("another panel");
    expect(placementProblem(panel(7, 2), [left], ROOF)).toBeNull();
    const tight = { ...ROOF, options: { ...DEFAULT_LAYOUT, panelGapMm: 0 } };
    expect(placementProblem(panel(6, 2), [left], tight)).toBeNull();
  });

  it("accepts every panel of the automatic layout", () => {
    const { panels } = recommendPanels(20, 30, TILE, [], PANEL, DEFAULT_LAYOUT);
    panels.forEach((p, i) => {
      expect(placementProblem(p, panels.filter((_, j) => j !== i), ROOF)).toBeNull();
    });
  });
});

describe("editing a layout", () => {
  const panels = [
    { id: "a", fromLeft: 2, fromBottom: 2, orientation: "portrait" as const },
    { id: "b", fromLeft: 7, fromBottom: 2, orientation: "portrait" as const },
  ];

  it("finds the panel under a position", () => {
    expect(panelAt(panels, { fromLeft: 3, fromBottom: 4 }, PANEL, TILE)).toBe(0);
    expect(panelAt(panels, { fromLeft: 8, fromBottom: 3 }, PANEL, TILE)).toBe(1);
    expect(panelAt(panels, { fromLeft: 20, fromBottom: 15 }, PANEL, TILE)).toBe(-1);
  });

  it("flags panels that stop fitting after the count changes", () => {
    expect(invalidPanelIds(panels, PANEL, ROOF)).toEqual([]);
    expect(invalidPanelIds(panels, PANEL, { ...ROOF, columns: 10 })).toEqual(["b"]);
  });

  it("summarises count, power, coverage and orientation", () => {
    const placed = [panel(2, 2), panel(7, 2)];
    const plan = summarisePlan("manual", placed, PANEL, 20, 30, TILE);
    expect(plan).toMatchObject({ mode: "manual", count: 2, systemKwp: 0.8, orientation: "portrait", coveragePct: 8 });
    const mixed = summarisePlan("manual", [panel(2, 2), panel(10, 2, "landscape")], PANEL, 20, 30, TILE);
    expect(mixed.orientation).toBe("mixed");
  });

  it("describes a panel the way obstructions are described", () => {
    expect(describePanel(panels[0])).toBe("2 tiles from the bottom, 2 from the left, portrait");
  });
});

describe("tileAt", () => {
  const quad: Quad = [
    { x: 300, y: 100 },
    { x: 900, y: 120 },
    { x: 1100, y: 700 },
    { x: 100, y: 680 },
  ];

  it("is the exact inverse of the panel outline, through perspective", () => {
    const outline = panelOutline(panel(5, 4), TILE, quad, 20, 30)!;
    const bottomLeft = tileAt(outline[3], quad, 20, 30)!;
    expect(bottomLeft.fromLeft).toBeCloseTo(5, 6);
    expect(bottomLeft.fromBottom).toBeCloseTo(4, 6);
  });

  it("returns null off the roof", () => {
    expect(tileAt({ x: 50, y: 50 }, quad, 20, 30)).toBeNull();
  });
});
