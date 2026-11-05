"use client";

import { useMemo, useRef, useState } from "react";
import {
  describePanel,
  invalidPanelIds,
  panelAt,
  placementProblem,
  placePanel,
  snapToTiles,
  summarisePlan,
  type ManualPanel,
  type PanelMode,
  type PanelPlan,
  type RoofContext,
  type TilePoint,
} from "@/lib/tile-count/planning/panel-plan";
import { coverWidthMm, exposedHeightMm } from "@/lib/tile-count/planning/dimensions";
import {
  DEFAULT_LAYOUT,
  PANEL_PRESETS,
  recommendPanels,
  validatePanelInputs,
  type LayoutOptions,
  type PanelOrientation,
  type PanelSpec,
} from "@/lib/tile-count/planning/panels";
import { panelOutline, tileAt } from "@/lib/tile-count/vision/grid";
import type { Obstruction, Point, Quad, TileSize } from "@/lib/tile-count/types";
import type { OverlayGhost, OverlayShape } from "../overlay/RoofOverlay";

function numericFields<T extends Record<string, number>>(values: T) {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])) as Record<keyof T, string>;
}

interface Input {
  /** Null until the counts, tile size and obstructions are all usable. */
  roof: { rows: number; columns: number; size: TileSize; obstructions: Obstruction[] } | null;
  quad: Quad | null;
  /** Called on every change that can alter the exported result. */
  onEdit: () => void;
}

/** Panel planning state: counts only, the automatic proposal, or panels placed by hand on the tile grid. */
export function usePanelPlan({ roof, quad, onEdit }: Input) {
  const [mode, setModeValue] = useState<PanelMode>("auto");
  const [presetName, setPresetName] = useState(PANEL_PRESETS[1].name);
  const [panel, setPanelValue] = useState(() => {
    const { lengthMm, widthMm, wattsPeak } = PANEL_PRESETS[1];
    return numericFields({ lengthMm, widthMm, wattsPeak });
  });
  const [layout, setLayoutValue] = useState(() => numericFields({ ...DEFAULT_LAYOUT }));
  const [manualPanels, setManualPanels] = useState<ManualPanel[]>([]);
  const [orientation, setOrientation] = useState<PanelOrientation>("portrait");
  const [hover, setHover] = useState<TilePoint | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  const nextId = useRef(1);

  const panelSpec: PanelSpec = useMemo(
    () => ({
      name: presetName,
      lengthMm: Number(panel.lengthMm),
      widthMm: Number(panel.widthMm),
      wattsPeak: Number(panel.wattsPeak),
    }),
    [panel, presetName],
  );
  const layoutOptions: LayoutOptions = useMemo(
    () => ({
      edgeSetbackMm: Number(layout.edgeSetbackMm),
      panelGapMm: Number(layout.panelGapMm),
      obstructionClearanceMm: Number(layout.obstructionClearanceMm),
    }),
    [layout],
  );
  const panelErrors = validatePanelInputs(panelSpec, layoutOptions);
  const usable = panelErrors.length === 0;

  const context: RoofContext | null = useMemo(
    () => (roof && usable ? { ...roof, options: layoutOptions } : null),
    [roof, usable, layoutOptions],
  );

  const recommendation = useMemo(
    () =>
      context &&
      recommendPanels(context.rows, context.columns, context.size, context.obstructions, panelSpec, layoutOptions),
    [context, panelSpec, layoutOptions],
  );

  const invalidIds = useMemo(
    () => (context && mode === "manual" ? invalidPanelIds(manualPanels, panelSpec, context) : []),
    [context, mode, manualPanels, panelSpec],
  );

  const plan: PanelPlan | null = useMemo(() => {
    if (!context || mode === "none") return null;
    const placed =
      mode === "auto"
        ? (recommendation?.panels ?? [])
        : manualPanels.map((p) => placePanel(p, panelSpec, context.size));
    return summarisePlan(mode, placed, panelSpec, context.rows, context.columns, context.size);
  }, [context, mode, recommendation, manualPanels, panelSpec]);

  const panelShapes = useMemo<OverlayShape[]>(() => {
    if (!context || !quad || !plan) return [];
    return plan.panels.flatMap((p, i) => {
      const outline = panelOutline(p, context.size, quad, context.rows, context.columns);
      const id = mode === "manual" ? manualPanels[i]?.id : `auto-${i}`;
      return outline ? [{ key: id ?? `panel-${i}`, outline, invalid: invalidIds.includes(id ?? "") }] : [];
    });
  }, [context, quad, plan, mode, manualPanels, invalidIds]);

  function candidateAt(point: TilePoint) {
    if (!context) return null;
    const snapped = snapToTiles(point, orientation, panelSpec, context);
    const placed = placePanel(snapped, panelSpec, context.size);
    const others = manualPanels.map((p) => placePanel(p, panelSpec, context.size));
    return { snapped, placed, problem: placementProblem(placed, others, context) };
  }

  /** Preview of the panel a click would place. Hidden over an existing panel, where a click removes it. */
  const ghost = useMemo<OverlayGhost | null>(() => {
    if (!hover || !context || !quad || mode !== "manual") return null;
    if (panelAt(manualPanels, hover, panelSpec, context.size) >= 0) return null;
    const candidate = candidateAt(hover);
    const outline = candidate && panelOutline(candidate.placed, context.size, quad, context.rows, context.columns);
    return outline ? { outline, valid: candidate.problem === null } : null;
    // candidateAt only reads the listed values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, context, quad, mode, manualPanels, panelSpec, orientation]);

  function setPanels(next: ManualPanel[]) {
    setManualPanels(next);
    setPlacementError(null);
    onEdit();
  }

  function add(position: Omit<ManualPanel, "id">) {
    setPanels([...manualPanels, { ...position, id: `panel-${nextId.current++}` }]);
  }

  function tilePoint(point: Point): TilePoint | null {
    return context && quad ? tileAt(point, quad, context.rows, context.columns) : null;
  }

  /** A click on the photo: removes the panel under it, or places a new one snapped to the tiles. */
  function pick(point: Point) {
    if (!context) return;
    const tile = tilePoint(point);
    if (!tile) {
      setPlacementError("Click inside the roof outline.");
      return;
    }
    const hit = panelAt(manualPanels, tile, panelSpec, context.size);
    if (hit >= 0) {
      setPanels(manualPanels.filter((_, i) => i !== hit));
      return;
    }
    const candidate = candidateAt(tile);
    if (!candidate) return;
    if (candidate.problem) setPlacementError(candidate.problem);
    else add(candidate.snapped);
  }

  /** Exact entry, for a position already read off the CAD drawing. */
  function addAt(fromBottom: number, fromLeft: number) {
    if (!context) return;
    if (![fromBottom, fromLeft].every((n) => Number.isInteger(n) && n >= 0)) {
      setPlacementError("Position must be whole numbers of tiles.");
      return;
    }
    const position = { fromLeft, fromBottom, orientation };
    const placed = placePanel(position, panelSpec, context.size);
    const others = manualPanels.map((p) => placePanel(p, panelSpec, context.size));
    const problem = placementProblem(placed, others, context);
    if (problem) setPlacementError(problem);
    else add(position);
  }

  /** Moves the automatic layout into manual mode, so single panels can be added or removed. */
  function editAutomaticLayout() {
    if (!recommendation || !context) return;
    const cover = coverWidthMm(context.size);
    const exposed = exposedHeightMm(context.size);
    setModeValue("manual");
    setOrientation(recommendation.orientation);
    setPanels(
      recommendation.panels.map((p) => ({
        id: `panel-${nextId.current++}`,
        fromLeft: p.xMm / cover,
        fromBottom: p.yMm / exposed,
        orientation: recommendation.orientation,
      })),
    );
  }

  function choosePreset(name: string) {
    const preset = PANEL_PRESETS.find((p) => p.name === name);
    if (!preset) return;
    const { lengthMm, widthMm, wattsPeak } = preset;
    setPresetName(name);
    setPanelValue(numericFields({ lengthMm, widthMm, wattsPeak }));
    onEdit();
  }

  return {
    mode,
    presetName,
    panel,
    layout,
    panelSpec,
    layoutOptions,
    panelErrors,
    recommendation,
    plan,
    panelShapes,
    ghost,
    manualPanels,
    panelDescriptions: manualPanels.map(describePanel),
    invalidIds,
    orientation,
    placementError,
    setOrientation,
    setMode(next: PanelMode) {
      setModeValue(next);
      setPlacementError(null);
      onEdit();
    },
    setPanel(patch: Partial<typeof panel>) {
      setPanelValue((current) => ({ ...current, ...patch }));
      setPresetName("Custom panel");
      onEdit();
    },
    setLayout(patch: Partial<typeof layout>) {
      setLayoutValue((current) => ({ ...current, ...patch }));
      onEdit();
    },
    choosePreset,
    pick,
    hoverAt: (point: Point | null) => setHover(point && tilePoint(point)),
    addAt,
    remove: (id: string) => setPanels(manualPanels.filter((p) => p.id !== id)),
    clear: () => setPanels([]),
    editAutomaticLayout,
    /** A new roof starts clean. The chosen panel type and spacing carry over. */
    resetRoof() {
      setManualPanels([]);
      setHover(null);
      setPlacementError(null);
    },
  };
}

export type PanelPlanState = ReturnType<typeof usePanelPlan>;
