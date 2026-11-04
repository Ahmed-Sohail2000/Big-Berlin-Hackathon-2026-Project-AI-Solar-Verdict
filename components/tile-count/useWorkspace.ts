"use client";

import { useCallback, useMemo, useState } from "react";
import { countTiles } from "@/lib/tile-count/count";
import { heuristicRoofDetector } from "@/lib/tile-count/detect-roof";
import { computeDimensions, validateTileSize } from "@/lib/tile-count/dimensions";
import { toCsv, toJson, toPdf, type TileReport } from "@/lib/tile-count/export";
import { gridLines, obstructionOutline, panelOutline } from "@/lib/tile-count/grid";
import { isValidQuad } from "@/lib/tile-count/homography";
import { proposeObstructions, validateObstruction } from "@/lib/tile-count/obstructions";
import {
  DEFAULT_LAYOUT,
  PANEL_PRESETS,
  recommendPanels,
  validatePanelInputs,
  type LayoutOptions,
  type PanelSpec,
} from "@/lib/tile-count/panels";
import { rectifiedSize, rectify, toGray } from "@/lib/tile-count/rectify";
import type {
  ConfidenceLevel,
  GrayImage,
  Obstruction,
  Quad,
  RgbaImage,
  TileCountResult,
  TileSize,
} from "@/lib/tile-count/types";
import { annotatedCanvas, canvasToBlob, downloadBlob } from "./annotate";
import { decodePhoto } from "./decode";
import type { OverlayShape } from "./RoofOverlay";
import { renderSamplePhoto, SAMPLE_CORNERS } from "./sample";

export const STEPS = [
  { id: "photo", label: "Photo" },
  { id: "roof", label: "Roof edges" },
  { id: "tiles", label: "Tiles" },
  { id: "obstructions", label: "Obstructions" },
  { id: "panels", label: "Panels" },
  { id: "export", label: "Export" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];
export type ExportFormat = "pdf" | "png" | "csv" | "json";

interface Photo {
  canvas: HTMLCanvasElement;
  gray: GrayImage;
  sample: boolean;
}

const EMPTY_TILE = { height: "", width: "", headLap: "", sideLap: "0", spacing: "" };

function numericFields<T extends Record<string, number>>(values: T) {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])) as Record<keyof T, string>;
}

function parseCount(value: string): number | null {
  const count = Number(value);
  return value !== "" && Number.isInteger(count) && count > 0 ? count : null;
}

/** A low-confidence count is never offered as a value; the employee has to enter it. */
function suggestedCount(count: number | null, level: ConfidenceLevel): string {
  return count !== null && level !== "low" ? String(count) : "";
}

function canvasFromPixels({ data, width, height }: RgbaImage): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas;
}

/** All workspace state and actions. Everything lives in memory and ends with the tab. */
export function useWorkspace() {
  const [step, setStep] = useState<StepId>("photo");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [result, setResult] = useState<TileCountResult | null>(null);
  const [rows, setRowsValue] = useState("");
  const [columns, setColumnsValue] = useState("");
  const [obstructions, setObstructionsValue] = useState<Obstruction[]>([]);
  const [tile, setTileValue] = useState(EMPTY_TILE);
  const [presetName, setPresetName] = useState(PANEL_PRESETS[1].name);
  const [panel, setPanelValue] = useState(() => {
    const { lengthMm, widthMm, wattsPeak } = PANEL_PRESETS[1];
    return numericFields({ lengthMm, widthMm, wattsPeak });
  });
  const [layout, setLayoutValue] = useState(() => numericFields({ ...DEFAULT_LAYOUT }));
  const [caseReference, setCaseReferenceValue] = useState("");
  const [roofSurface, setRoofSurfaceValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showPanels, setShowPanels] = useState(true);

  /** Any edit after confirmation sends the result back for review. */
  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setConfirmed(false);
    };

  const rowCount = parseCount(rows);
  const columnCount = parseCount(columns);

  const tileSize: TileSize = useMemo(
    () => ({
      heightMm: Number(tile.height),
      widthMm: Number(tile.width),
      headLapMm: Number(tile.headLap),
      sideLapMm: Number(tile.sideLap),
      rowSpacingMm: tile.spacing === "" ? undefined : Number(tile.spacing),
    }),
    [tile],
  );
  const tileErrors = validateTileSize(tileSize);
  const dimensions =
    rowCount !== null && columnCount !== null && tileErrors.length === 0
      ? computeDimensions(rowCount, columnCount, tileSize)
      : null;

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

  const obstructionsValid =
    rowCount !== null &&
    columnCount !== null &&
    obstructions.every((o) => validateObstruction(o, rowCount, columnCount) === null);
  const pendingProposals = obstructions.filter((o) => o.proposed).length;

  const recommendation = useMemo(() => {
    if (!dimensions || rowCount === null || columnCount === null) return null;
    if (panelErrors.length > 0 || !obstructionsValid) return null;
    return recommendPanels(rowCount, columnCount, tileSize, obstructions, panelSpec, layoutOptions);
    // panelErrors is derived from the listed inputs and is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions?.heightM, dimensions?.widthM, rowCount, columnCount, tileSize, obstructions, panelSpec, layoutOptions, obstructionsValid]);

  const blocker =
    (!dimensions && (tileErrors[0] ?? "Enter the tiles high and wide.")) ||
    (pendingProposals > 0 && `Accept or remove ${pendingProposals} proposed area(s).`) ||
    (!obstructionsValid && "Fix the obstruction areas first.") ||
    null;

  const hasGrid = quad !== null && rowCount !== null && columnCount !== null;
  const grid = useMemo(
    () => (hasGrid && showGrid ? gridLines(quad, rowCount, columnCount) : []),
    [hasGrid, showGrid, quad, rowCount, columnCount],
  );
  const obstructionShapes = useMemo<OverlayShape[]>(() => {
    if (!hasGrid) return [];
    return obstructions.flatMap((o) => {
      const outline = obstructionOutline(o, quad, rowCount, columnCount);
      return outline ? [{ key: o.id, outline, dashed: o.proposed }] : [];
    });
  }, [hasGrid, obstructions, quad, rowCount, columnCount]);
  const panelOutlines = useMemo<OverlayShape[]>(() => {
    if (!hasGrid || !recommendation) return [];
    return recommendation.panels.flatMap((p, i) => {
      const outline = panelOutline(p, tileSize, quad, rowCount, columnCount);
      return outline ? [{ key: `panel-${i}`, outline }] : [];
    });
  }, [hasGrid, recommendation, tileSize, quad, rowCount, columnCount]);

  const applyCount = useCallback((next: TileCountResult) => {
    setResult(next);
    setRowsValue(suggestedCount(next.rows.count, next.level));
    setColumnsValue(suggestedCount(next.columns.count, next.level));
    setConfirmed(false);
  }, []);

  /** Yields to the browser first so the busy state paints before the heavy work starts. */
  const runCount = useCallback(
    (gray: GrayImage, corners: Quad) => {
      setBusy(true);
      setTimeout(() => {
        applyCount(countTiles(gray, corners));
        setBusy(false);
      }, 0);
    },
    [applyCount],
  );

  function clearRoof() {
    setPhoto(null);
    setQuad(null);
    setResult(null);
    setRowsValue("");
    setColumnsValue("");
    setObstructionsValue([]);
    setConfirmed(false);
    setError(null);
  }

  function startPhoto(canvas: HTMLCanvasElement, pixels: RgbaImage, corners: Quad, sample: boolean) {
    const gray = toGray(pixels);
    setPhoto({ canvas, gray, sample });
    setQuad(corners);
    setStep("roof");
    runCount(gray, corners);
  }

  async function loadFile(file: File) {
    clearRoof();
    setBusy(true);
    try {
      const { canvas, pixels } = await decodePhoto(file);
      startPhoto(canvas, pixels, heuristicRoofDetector.detect(pixels).quad, false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This file could not be read.");
      setBusy(false);
    }
  }

  function loadSample() {
    clearRoof();
    const pixels = renderSamplePhoto();
    setTileValue({ height: "420", width: "330", headLap: "70", sideLap: "30", spacing: "" });
    startPhoto(canvasFromPixels(pixels), pixels, SAMPLE_CORNERS, true);
  }

  /** Discards the photo, results and inputs for this roof. */
  function startOver() {
    clearRoof();
    setTileValue(EMPTY_TILE);
    setCaseReferenceValue("");
    setRoofSurfaceValue("");
    setStep("photo");
  }

  function commitQuad(next: Quad) {
    setQuad(next);
    setConfirmed(false);
    if (!photo) return;
    if (isValidQuad(next)) runCount(photo.gray, next);
    else applyCount(countTiles(photo.gray, next));
  }

  function detectObstructions() {
    if (!photo || !quad || rowCount === null || columnCount === null) return;
    const { width, height } = rectifiedSize(quad);
    const flat = rectify(photo.gray, quad, width, height);
    if (!flat) return;
    const manual = obstructions.filter((o) => !o.proposed);
    setObstructionsValue([...manual, ...proposeObstructions(flat, rowCount, columnCount)]);
    setConfirmed(false);
  }

  function choosePreset(name: string) {
    const preset = PANEL_PRESETS.find((p) => p.name === name);
    if (!preset) return;
    const { lengthMm, widthMm, wattsPeak } = preset;
    setPresetName(name);
    setPanelValue(numericFields({ lengthMm, widthMm, wattsPeak }));
    setConfirmed(false);
  }

  function buildReport(): TileReport | null {
    if (rowCount === null || columnCount === null || !quad || !result) return null;
    return {
      caseReference,
      roofSurface,
      generatedAt: new Date().toISOString(),
      rows: rowCount,
      columns: columnCount,
      correctedByEmployee: rowCount !== result.rows.count || columnCount !== result.columns.count,
      confidence: result.level,
      warnings: result.warnings,
      tileSize,
      corners: quad,
      obstructions,
      panels: recommendation
        ? { spec: panelSpec, layout: layoutOptions, recommendation }
        : undefined,
    };
  }

  async function exportAs(format: ExportFormat) {
    const report = buildReport();
    if (!report || !photo) return;
    const baseName = `tile-count-${(caseReference || "roof").replace(/[^\w-]+/g, "-")}`;
    if (format === "json") {
      downloadBlob(new Blob([toJson(report)], { type: "application/json" }), `${baseName}.json`);
      return;
    }
    if (format === "csv") {
      downloadBlob(new Blob([toCsv(report)], { type: "text/csv" }), `${baseName}.csv`);
      return;
    }
    const canvas = annotatedCanvas(
      photo.canvas,
      report.corners,
      report.rows,
      report.columns,
      obstructions,
      panelOutlines.map((p) => p.outline),
    );
    if (format === "png") {
      downloadBlob(await canvasToBlob(canvas, "image/png"), `${baseName}.png`);
      return;
    }
    const jpeg = new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg")).arrayBuffer());
    const pdf = toPdf(report, jpeg, canvas.width, canvas.height);
    downloadBlob(new Blob([pdf.slice()], { type: "application/pdf" }), `${baseName}.pdf`);
  }

  return {
    step,
    setStep,
    photo,
    quad,
    result,
    busy,
    error,
    rows,
    columns,
    rowCount,
    columnCount,
    tile,
    tileErrors,
    dimensions,
    obstructions,
    grid,
    obstructionShapes,
    panelOutlines,
    presetName,
    panel,
    layout,
    panelErrors,
    recommendation,
    caseReference,
    roofSurface,
    blocker,
    confirmed,
    showGrid,
    showPanels,
    setShowGrid,
    setShowPanels,
    setRows: edit(setRowsValue),
    setColumns: edit(setColumnsValue),
    setTile: edit((patch: Partial<typeof EMPTY_TILE>) => setTileValue((current) => ({ ...current, ...patch }))),
    setObstructions: edit(setObstructionsValue),
    setPanel: edit((patch: Partial<typeof panel>) => {
      setPanelValue((current) => ({ ...current, ...patch }));
      setPresetName("Custom panel");
    }),
    setLayout: edit((patch: Partial<typeof layout>) => setLayoutValue((current) => ({ ...current, ...patch }))),
    setCaseReference: edit(setCaseReferenceValue),
    setRoofSurface: edit(setRoofSurfaceValue),
    choosePreset,
    setQuad,
    invalidate: () => setConfirmed(false),
    commitQuad,
    loadFile,
    loadSample,
    startOver,
    detectObstructions,
    confirm: () => setConfirmed(true),
    exportAs,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
