// lib/tile-count/planning/panels.ts
// Recommends how many solar panels fit, from the confirmed roof size and
// obstruction areas. A planning proposal: the final layout, fire setbacks and
// structural checks stay with the CAD drawing. Shading and orientation are not
// assessed (briefing §4).
// PURE, DETERMINISTIC, no I/O.

import { coverWidthMm, exposedHeightMm } from "./dimensions";
import type { Obstruction, TileSize } from "../types";

export interface PanelSpec {
  name: string;
  lengthMm: number;
  widthMm: number;
  wattsPeak: number;
}

export interface LayoutOptions {
  /** Clear strip along every roof edge. */
  edgeSetbackMm: number;
  /** Gap between neighbouring panels. */
  panelGapMm: number;
  /** Clear strip around every obstruction. */
  obstructionClearanceMm: number;
}

/** Generic module sizes, not specific products. Every value can be edited. */
export const PANEL_PRESETS: PanelSpec[] = [
  { name: "Standard 420 W", lengthMm: 1722, widthMm: 1134, wattsPeak: 420 },
  { name: "Standard 440 W", lengthMm: 1762, widthMm: 1134, wattsPeak: 440 },
  { name: "Large 460 W", lengthMm: 1903, widthMm: 1134, wattsPeak: 460 },
];

export const DEFAULT_LAYOUT: LayoutOptions = {
  edgeSetbackMm: 300,
  panelGapMm: 20,
  obstructionClearanceMm: 200,
};

export type PanelOrientation = "portrait" | "landscape";

/** Panel position on the roof plane, measured from the bottom-left corner. */
export interface PlacedPanel {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface PanelRecommendation {
  orientation: PanelOrientation;
  count: number;
  systemKwp: number;
  /** Share of the roof surface covered by panels, in percent. */
  coveragePct: number;
  panels: PlacedPanel[];
  /** The orientation not chosen, for comparison. */
  alternative: { orientation: PanelOrientation; count: number };
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function blockedAreas(
  obstructions: Obstruction[],
  size: TileSize,
  clearance: number,
): Rect[] {
  const cover = coverWidthMm(size);
  const exposed = exposedHeightMm(size);
  return obstructions.map((o) => ({
    x0: o.fromLeft * cover - clearance,
    y0: o.fromBottom * exposed - clearance,
    x1: (o.fromLeft + o.widthTiles) * cover + clearance,
    y1: (o.fromBottom + o.heightTiles) * exposed + clearance,
  }));
}

/**
 * Fills straight panel rows upward from the eave. Rows stay at a fixed height so
 * rails can run through; inside a row, a blocked position jumps past the obstacle.
 */
function fillRows(
  roofWidthMm: number,
  roofHeightMm: number,
  panelWidth: number,
  panelHeight: number,
  blocked: Rect[],
  options: LayoutOptions,
): PlacedPanel[] {
  const { edgeSetbackMm: setback, panelGapMm: gap } = options;
  const panels: PlacedPanel[] = [];
  const right = roofWidthMm - setback;
  const top = roofHeightMm - setback;

  for (let y = setback; y + panelHeight <= top; y += panelHeight + gap) {
    let x = setback;
    while (x + panelWidth <= right) {
      const candidate = { x0: x, y0: y, x1: x + panelWidth, y1: y + panelHeight };
      const hit = blocked.find(
        (b) => candidate.x0 < b.x1 && candidate.x1 > b.x0 && candidate.y0 < b.y1 && candidate.y1 > b.y0,
      );
      if (hit) {
        x = hit.x1;
        continue;
      }
      panels.push({ xMm: x, yMm: y, widthMm: panelWidth, heightMm: panelHeight });
      x += panelWidth + gap;
    }
  }
  return panels;
}

/** Returns human-readable problems with the panel inputs; empty means usable. */
export function validatePanelInputs(panel: PanelSpec, options: LayoutOptions): string[] {
  const errors: string[] = [];
  if (!(panel.lengthMm > 0) || !(panel.widthMm > 0)) errors.push("Enter the panel length and width.");
  if (!(panel.wattsPeak > 0)) errors.push("Enter the panel power.");
  if (!(options.edgeSetbackMm >= 0) || !(options.panelGapMm >= 0) || !(options.obstructionClearanceMm >= 0)) {
    errors.push("Spacing values cannot be negative.");
  }
  return errors;
}

/** Tries both orientations and recommends the one fitting more panels; a tie goes to portrait. */
export function recommendPanels(
  rows: number,
  columns: number,
  size: TileSize,
  obstructions: Obstruction[],
  panel: PanelSpec,
  options: LayoutOptions = DEFAULT_LAYOUT,
): PanelRecommendation {
  const roofWidthMm = columns * coverWidthMm(size);
  const roofHeightMm = rows * exposedHeightMm(size);
  const blocked = blockedAreas(obstructions, size, options.obstructionClearanceMm);

  const portrait = fillRows(roofWidthMm, roofHeightMm, panel.widthMm, panel.lengthMm, blocked, options);
  const landscape = fillRows(roofWidthMm, roofHeightMm, panel.lengthMm, panel.widthMm, blocked, options);
  const usePortrait = portrait.length >= landscape.length;
  const panels = usePortrait ? portrait : landscape;

  const coveredMm2 = panels.length * panel.lengthMm * panel.widthMm;
  return {
    orientation: usePortrait ? "portrait" : "landscape",
    count: panels.length,
    systemKwp: Math.round(panels.length * panel.wattsPeak) / 1000,
    coveragePct: Math.round((coveredMm2 / (roofWidthMm * roofHeightMm)) * 1000) / 10,
    panels,
    alternative: {
      orientation: usePortrait ? "landscape" : "portrait",
      count: usePortrait ? landscape.length : portrait.length,
    },
  };
}
