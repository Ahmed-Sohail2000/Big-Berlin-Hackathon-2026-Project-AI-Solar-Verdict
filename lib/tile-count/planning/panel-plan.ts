// lib/tile-count/planning/panel-plan.ts
// The planner's own panel layout. Panels are placed by click, but they snap to the
// counted tile grid and every position is kept in tiles, so the layout stays as exact
// as the count. This is deliberately not free drag-and-drop: the client rejected that
// as imprecise (briefing §1, §3). The final layout still belongs to the CAD drawing.
// PURE, DETERMINISTIC, no I/O.

import { coverWidthMm, exposedHeightMm } from "./dimensions";
import { blockedAreas, type LayoutOptions, type PanelOrientation, type PanelSpec, type PlacedPanel } from "./panels";
import type { Obstruction, TileSize } from "../types";

/** "none" stops at the counts, which is the briefing's exact scope. */
export type PanelMode = "none" | "auto" | "manual";

/** Lower-left corner in tiles from the bottom-left of the roof. Fractions only come from copying the automatic layout. */
export interface ManualPanel {
  id: string;
  fromLeft: number;
  fromBottom: number;
  orientation: PanelOrientation;
}

export interface TilePoint {
  fromLeft: number;
  fromBottom: number;
}

export interface RoofContext {
  rows: number;
  columns: number;
  size: TileSize;
  obstructions: Obstruction[];
  options: LayoutOptions;
}

export interface PanelPlan {
  mode: "auto" | "manual";
  count: number;
  systemKwp: number;
  /** Share of the roof surface covered by panels, in percent. */
  coveragePct: number;
  orientation: PanelOrientation | "mixed";
  panels: PlacedPanel[];
}

/** Absorbs rounding, so panels exactly one gap apart do not count as touching. */
const EPSILON_MM = 1e-6;

export function placePanel(panel: Omit<ManualPanel, "id">, spec: PanelSpec, size: TileSize): PlacedPanel {
  const portrait = panel.orientation === "portrait";
  return {
    xMm: panel.fromLeft * coverWidthMm(size),
    yMm: panel.fromBottom * exposedHeightMm(size),
    widthMm: portrait ? spec.widthMm : spec.lengthMm,
    heightMm: portrait ? spec.lengthMm : spec.widthMm,
  };
}

/**
 * Centres a panel on the clicked tile position, then snaps its lower-left corner to
 * the nearest tile corner and keeps it on the roof.
 */
export function snapToTiles(
  point: TilePoint,
  orientation: ManualPanel["orientation"],
  spec: PanelSpec,
  { rows, columns, size }: Pick<RoofContext, "rows" | "columns" | "size">,
): Omit<ManualPanel, "id"> {
  const footprint = placePanel({ fromLeft: 0, fromBottom: 0, orientation }, spec, size);
  const tilesWide = footprint.widthMm / coverWidthMm(size);
  const tilesHigh = footprint.heightMm / exposedHeightMm(size);
  const clamp = (value: number, room: number) => Math.max(0, Math.min(Math.round(value), Math.floor(room)));
  return {
    fromLeft: clamp(point.fromLeft - tilesWide / 2, columns - tilesWide),
    fromBottom: clamp(point.fromBottom - tilesHigh / 2, rows - tilesHigh),
    orientation,
  };
}

/** Index of the panel under a tile position, or -1. Used to remove a panel by clicking it. */
export function panelAt(panels: ManualPanel[], point: TilePoint, spec: PanelSpec, size: TileSize): number {
  const x = point.fromLeft * coverWidthMm(size);
  const y = point.fromBottom * exposedHeightMm(size);
  return panels.findIndex((panel) => {
    const p = placePanel(panel, spec, size);
    return x >= p.xMm && x <= p.xMm + p.widthMm && y >= p.yMm && y <= p.yMm + p.heightMm;
  });
}

/** Why a panel cannot sit here, or null when it fits. `others` are the panels already placed. */
export function placementProblem(
  panel: PlacedPanel,
  others: PlacedPanel[],
  { rows, columns, size, obstructions, options }: RoofContext,
): string | null {
  const roofWidth = columns * coverWidthMm(size);
  const roofHeight = rows * exposedHeightMm(size);
  const [x0, y0] = [panel.xMm, panel.yMm];
  const [x1, y1] = [x0 + panel.widthMm, y0 + panel.heightMm];
  const edge = options.edgeSetbackMm - EPSILON_MM;

  if (x0 < edge || y0 < edge || x1 > roofWidth - edge || y1 > roofHeight - edge) {
    return `Too close to the roof edge. The edge distance is ${options.edgeSetbackMm} mm.`;
  }
  const blocked = blockedAreas(obstructions, size, options.obstructionClearanceMm);
  const onObstruction = blocked.some(
    (b) => x0 < b.x1 - EPSILON_MM && x1 > b.x0 + EPSILON_MM && y0 < b.y1 - EPSILON_MM && y1 > b.y0 + EPSILON_MM,
  );
  if (onObstruction) return `Too close to an obstruction. The clearance is ${options.obstructionClearanceMm} mm.`;

  const gap = options.panelGapMm - EPSILON_MM;
  const touches = others.some(
    (o) =>
      x0 < o.xMm + o.widthMm + gap && x1 > o.xMm - gap && y0 < o.yMm + o.heightMm + gap && y1 > o.yMm - gap,
  );
  return touches ? `Too close to another panel. The gap is ${options.panelGapMm} mm.` : null;
}

/** Ids of placed panels that no longer fit, for example after the count or an obstruction changed. */
export function invalidPanelIds(panels: ManualPanel[], spec: PanelSpec, context: RoofContext): string[] {
  const placed = panels.map((panel) => placePanel(panel, spec, context.size));
  return panels
    .filter((_, i) => placementProblem(placed[i], placed.filter((_, j) => j !== i), context) !== null)
    .map((panel) => panel.id);
}

export function summarisePlan(
  mode: PanelPlan["mode"],
  panels: PlacedPanel[],
  spec: PanelSpec,
  rows: number,
  columns: number,
  size: TileSize,
): PanelPlan {
  const roofMm2 = rows * exposedHeightMm(size) * columns * coverWidthMm(size);
  const coveredMm2 = panels.reduce((sum, p) => sum + p.widthMm * p.heightMm, 0);
  const portrait = panels.filter((p) => p.heightMm >= p.widthMm).length;
  return {
    mode,
    count: panels.length,
    systemKwp: Math.round(panels.length * spec.wattsPeak) / 1000,
    coveragePct: Math.round((coveredMm2 / roofMm2) * 1000) / 10,
    orientation: portrait === panels.length ? "portrait" : portrait === 0 ? "landscape" : "mixed",
    panels,
  };
}

/** Same phrasing as obstructions, so a panel can be typed into the CAD drawing as it stands. */
export function describePanel(panel: Omit<ManualPanel, "id">): string {
  const round = (value: number) => Math.round(value * 100) / 100;
  return `${round(panel.fromBottom)} tiles from the bottom, ${round(panel.fromLeft)} from the left, ${panel.orientation}`;
}
