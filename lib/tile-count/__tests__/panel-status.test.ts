import { describe, expect, it } from "vitest";
import { noFitProblem, panelSetupProblem } from "../planning/panel-status";
import { DEFAULT_LAYOUT, PANEL_PRESETS } from "../planning/panels";
import type { Obstruction, TileSize } from "../types";

const SIZE: TileSize = { heightMm: 420, widthMm: 330, headLapMm: 70, sideLapMm: 30 };
const PANEL = PANEL_PRESETS[1];
const ROWS = 20;
const COLUMNS = 36;

function area(proposed: boolean, widthTiles = COLUMNS, heightTiles = ROWS): Obstruction {
  return { id: "a", kind: "other", fromBottom: 0, fromLeft: 0, widthTiles, heightTiles, proposed };
}

const noFit = (obstructions: Obstruction[], rows = ROWS, columns = COLUMNS) =>
  noFitProblem(rows, columns, SIZE, obstructions, PANEL, DEFAULT_LAYOUT);

describe("panelSetupProblem", () => {
  const ready = { rows: ROWS, columns: COLUMNS, obstructionsValid: true };

  it("is quiet when the roof is ready", () => {
    expect(panelSetupProblem(ready)).toBeNull();
  });

  it("sends a blank count back to the roof step", () => {
    expect(panelSetupProblem({ ...ready, rows: null })?.step).toBe("roof");
    expect(panelSetupProblem({ ...ready, columns: null })?.step).toBe("roof");
  });

  it("passes on the tile size problem and sends it to the tile step", () => {
    expect(panelSetupProblem({ ...ready, tileProblem: "Enter the tile height." })).toEqual({
      message: "Enter the tile height.",
      step: "tiles",
    });
  });

  it("sends an invalid obstruction to its step", () => {
    expect(panelSetupProblem({ ...ready, obstructionsValid: false })?.step).toBe("obstructions");
  });

  it("asks for the earliest step first", () => {
    expect(panelSetupProblem({ rows: null, columns: null, tileProblem: "x", obstructionsValid: false })?.step).toBe("roof");
  });
});

describe("noFitProblem", () => {
  it("is quiet when a panel fits", () => {
    expect(noFit([])).toBeNull();
  });

  it("blames proposed areas when accepting nothing would free the roof", () => {
    expect(noFit([area(true)])?.message).toContain("Proposed obstruction areas");
  });

  it("blames accepted areas when they fill the roof", () => {
    expect(noFit([area(false)])?.message).toContain("The marked obstructions");
  });

  it("calls a roof too small when it is empty and nothing fits", () => {
    expect(noFit([], 2, 2)).toEqual({
      message: "This roof is too small for the chosen panel. Check the tile counts and tile size.",
      step: "tiles",
    });
  });
});
