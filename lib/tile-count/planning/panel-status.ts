// lib/tile-count/planning/panel-status.ts
// Explains why panels cannot be placed, and which step fixes it. On a real photo the
// count is often blank or detection marks large areas, and without this the panel step
// simply shows nothing, or zero panels, with no reason.
// PURE, DETERMINISTIC, no I/O.

import { recommendPanels, type LayoutOptions, type PanelSpec } from "./panels";
import type { Obstruction, TileSize } from "../types";

export interface PanelProblem {
  message: string;
  /** The step that fixes it. */
  step: "roof" | "tiles" | "obstructions";
}

interface Setup {
  rows: number | null;
  columns: number | null;
  /** The first problem with the tile size, if any. */
  tileProblem?: string;
  obstructionsValid: boolean;
}

/** What is missing before any panel can be placed. Null when the roof is ready. */
export function panelSetupProblem({ rows, columns, tileProblem, obstructionsValid }: Setup): PanelProblem | null {
  if (rows === null || columns === null) return { message: "Enter the tiles high and wide first.", step: "roof" };
  if (tileProblem) return { message: tileProblem, step: "tiles" };
  return obstructionsValid ? null : { message: "Fix the obstruction areas first.", step: "obstructions" };
}

/** Why not one panel fits on a ready roof, found by retrying without the marked areas. */
export function noFitProblem(
  rows: number,
  columns: number,
  size: TileSize,
  obstructions: Obstruction[],
  panel: PanelSpec,
  options: LayoutOptions,
): PanelProblem | null {
  const fits = (areas: Obstruction[]) => recommendPanels(rows, columns, size, areas, panel, options).count > 0;
  if (fits(obstructions)) return null;
  if (fits(obstructions.filter((o) => !o.proposed))) {
    return { message: "Proposed obstruction areas leave no room for a panel. Resize or remove them.", step: "obstructions" };
  }
  if (fits([])) {
    return { message: "The marked obstructions leave no room for a panel. Resize or remove them.", step: "obstructions" };
  }
  return { message: "This roof is too small for the chosen panel. Check the tile counts and tile size.", step: "tiles" };
}
