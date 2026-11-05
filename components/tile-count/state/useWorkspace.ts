"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { countTiles } from "@/lib/tile-count/vision/count";
import { heuristicRoofDetector } from "@/lib/tile-count/vision/detect-roof";
import { computeDimensions, tileSizeWarnings, validateTileSize } from "@/lib/tile-count/planning/dimensions";
import { noFitProblem, panelSetupProblem } from "@/lib/tile-count/planning/panel-status";
import { toDxf } from "@/lib/tile-count/io/dxf";
import { toCsv, toJson, toPdf, type TileReport } from "@/lib/tile-count/io/export";
import type { Language } from "@/lib/i18n/language";
import { gridLines, obstructionOutline, tileAt, tileRectOutline, type TilePosition } from "@/lib/tile-count/vision/grid";
import { isValidQuad } from "@/lib/tile-count/vision/homography";
import { proposeObstructions, validateObstruction } from "@/lib/tile-count/vision/obstructions";
import { assessPhoto } from "@/lib/tile-count/vision/photo-quality";
import { rectifiedSize, rectify, toGray } from "@/lib/tile-count/vision/rectify";
import type {
  ConfidenceLevel,
  GrayImage,
  Obstruction,
  Point,
  Quad,
  RgbaImage,
  TileCountResult,
  TileSize,
} from "@/lib/tile-count/types";
import { annotatedCanvas, canvasToBlob, downloadBlob } from "../browser/annotate";
import { decodePhoto } from "../browser/decode";
import type { OverlayShape } from "../overlay/RoofOverlay";
import { filesFromDrop, screenFiles, type QueueItem } from "../browser/folder";
import { renderSamplePhoto, SAMPLE_CORNERS } from "../browser/sample";
import { usePanelPlan } from "./usePanelPlan";

export const STEPS = ["photo", "roof", "tiles", "obstructions", "panels", "export"] as const;

export type StepId = (typeof STEPS)[number];
export type ExportFormat = "pdf" | "png" | "dxf" | "csv" | "json";

interface Photo {
  canvas: HTMLCanvasElement;
  gray: GrayImage;
  sample: boolean;
  /** Problems with the file or the photo itself, separate from the count's own warnings. */
  warnings: string[];
}

const EMPTY_TILE = { height: "", width: "", headLap: "", sideLap: "0", spacing: "" };

/** Ids stay unique across typed and drawn areas. */
export function nextObstructionId(obstructions: Obstruction[]): string {
  return `manual-${obstructions.reduce((max, o) => Math.max(max, Number(o.id.split("-")[1]) || 0), 0) + 1}`;
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
  const [caseReference, setCaseReferenceValue] = useState("");
  const [roofSurface, setRoofSurfaceValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showPanels, setShowPanels] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [drawingArea, setDrawingArea] = useState(false);
  const [areaDraft, setAreaDraft] = useState<{ from: TilePosition; to: TilePosition } | null>(null);
  /** Bumped by every new load, so a slow file that finishes late cannot replace a newer one. */
  const loadId = useRef(0);

  const invalidate = useCallback(() => setConfirmed(false), []);

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
      // Blank stays NaN so validation asks for it. Number("") would silently mean zero.
      headLapMm: tile.headLap === "" ? Number.NaN : Number(tile.headLap),
      sideLapMm: tile.sideLap === "" ? Number.NaN : Number(tile.sideLap),
      rowSpacingMm: tile.spacing === "" ? undefined : Number(tile.spacing),
    }),
    [tile],
  );
  const tileErrors = validateTileSize(tileSize);
  const dimensionsReady = rowCount !== null && columnCount !== null && tileErrors.length === 0;
  const dimensions = dimensionsReady ? computeDimensions(rowCount, columnCount, tileSize) : null;
  const tileWarnings = tileErrors.length === 0 ? tileSizeWarnings(tileSize) : [];

  const obstructionsValid =
    rowCount !== null &&
    columnCount !== null &&
    obstructions.every((o) => validateObstruction(o, rowCount, columnCount) === null);
  const pendingProposals = obstructions.filter((o) => o.proposed).length;

  const roof = useMemo(
    () =>
      dimensionsReady && obstructionsValid && rowCount !== null && columnCount !== null
        ? { rows: rowCount, columns: columnCount, size: tileSize, obstructions }
        : null,
    [dimensionsReady, obstructionsValid, rowCount, columnCount, tileSize, obstructions],
  );
  const planner = usePanelPlan({ roof, quad, onEdit: invalidate });
  const { plan, panelShapes } = planner;

  const panelProblem =
    planner.mode === "none"
      ? null
      : (panelSetupProblem({
          rows: rowCount,
          columns: columnCount,
          tileProblem: tileErrors[0],
          obstructionsValid,
        }) ??
        (roof && planner.recommendation?.count === 0
          ? noFitProblem(roof.rows, roof.columns, roof.size, roof.obstructions, planner.panelSpec, planner.layoutOptions)
          : null));

  const blocker =
    (!dimensions && (tileErrors[0] ?? "Enter the tiles high and wide.")) ||
    (pendingProposals > 0 && `Accept or remove ${pendingProposals} proposed area(s).`) ||
    (!obstructionsValid && "Fix the obstruction areas first.") ||
    (planner.invalidIds.length > 0 && `Remove or move ${planner.invalidIds.length} panel(s) that no longer fit.`) ||
    (planner.mode === "manual" && planner.manualPanels.length === 0 && "Place at least one panel, or choose Counts only.") ||
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

  /** The area being dragged out, shown as a dashed outline until the mouse is released. */
  const areaFromDraft = useCallback(
    (draft: { from: TilePosition; to: TilePosition }) => {
      const left = Math.floor(Math.min(draft.from.fromLeft, draft.to.fromLeft));
      const bottom = Math.floor(Math.min(draft.from.fromBottom, draft.to.fromBottom));
      return {
        fromLeft: left,
        fromBottom: bottom,
        widthTiles: Math.floor(Math.max(draft.from.fromLeft, draft.to.fromLeft)) - left + 1,
        heightTiles: Math.floor(Math.max(draft.from.fromBottom, draft.to.fromBottom)) - bottom + 1,
      };
    },
    [],
  );
  const draftShape = useMemo<OverlayShape | null>(() => {
    if (!areaDraft || !hasGrid) return null;
    const { fromLeft, fromBottom, widthTiles, heightTiles } = areaFromDraft(areaDraft);
    const outline = tileRectOutline(fromLeft, fromBottom, widthTiles, heightTiles, quad, rowCount, columnCount);
    return outline && { key: "draft", outline, dashed: true };
  }, [areaDraft, areaFromDraft, hasGrid, quad, rowCount, columnCount]);
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
      const id = loadId.current;
      setTimeout(() => {
        if (id !== loadId.current) return;
        applyCount(countTiles(gray, corners));
        setBusy(false);
      }, 0);
    },
    [applyCount],
  );

  function clearRoof() {
    loadId.current++;
    planner.resetRoof();
    setDrawingArea(false);
    setAreaDraft(null);
    setBusy(false);
    setPhoto(null);
    setQuad(null);
    setResult(null);
    setRowsValue("");
    setColumnsValue("");
    setObstructionsValue([]);
    setConfirmed(false);
    setError(null);
  }

  function startPhoto(canvas: HTMLCanvasElement, pixels: RgbaImage, corners: Quad, sample: boolean, notices: string[] = []) {
    const gray = toGray(pixels);
    setPhoto({ canvas, gray, sample, warnings: [...notices, ...assessPhoto(gray)] });
    setQuad(corners);
    setStep("roof");
    runCount(gray, corners);
  }

  async function loadFile(file: File, queueIndex?: number) {
    clearRoof();
    const id = loadId.current;
    setBusy(true);
    try {
      const { canvas, pixels, notices } = await decodePhoto(file);
      if (id !== loadId.current) return;
      startPhoto(canvas, pixels, heuristicRoofDetector.detect(pixels).quad, false, notices);
    } catch (reason) {
      if (id !== loadId.current) return;
      const message = reason instanceof Error ? reason.message : "This file could not be read.";
      setError(message);
      setBusy(false);
      setStep("photo");
      // Back in the folder list, the file now shows why it did not open.
      setQueue((current) => current.map((q) => (q.index === queueIndex ? { ...q, problem: message, status: "waiting" } : q)));
    }
  }

  /** One file opens straight away. Several, or a folder, are checked and listed first. */
  async function addFiles(files: File[]) {
    if (files.length === 1) {
      setQueue([]);
      await loadFile(files[0]);
      return;
    }
    if (files.length === 0) return;
    clearRoof();
    setStep("photo");
    setBusy(true);
    setQueue(await screenFiles(files));
    setBusy(false);
  }

  async function addDrop(transfer: DataTransfer) {
    await addFiles(await filesFromDrop(transfer));
  }

  /** Opens a checked photo. Tile size and case reference carry over: same house, same tiles. */
  function openQueued(index: number) {
    const item = queue.find((q) => q.index === index);
    if (!item || item.problem) return;
    setQueue((current) =>
      current.map((q) => {
        if (q.index === index) return { ...q, status: "open" };
        return q.status === "open" ? { ...q, status: "waiting" } : q;
      }),
    );
    void loadFile(item.file, index);
  }

  const nextQueued = queue.find((q) => !q.problem && q.status === "waiting") ?? null;

  function loadSample() {
    clearRoof();
    const pixels = renderSamplePhoto();
    setTileValue({ height: "420", width: "330", headLap: "70", sideLap: "30", spacing: "" });
    startPhoto(canvasFromPixels(pixels), pixels, SAMPLE_CORNERS, true);
  }

  /** Discards the photo, results and inputs for this roof. */
  function startOver() {
    clearRoof();
    setQueue([]);
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

  function beginArea(point: Point) {
    if (!hasGrid) return;
    const tile = tileAt(point, quad, rowCount, columnCount);
    if (tile) setAreaDraft({ from: tile, to: tile });
  }

  function extendArea(point: Point) {
    if (!hasGrid || !areaDraft) return;
    const tile = tileAt(point, quad, rowCount, columnCount);
    if (tile) setAreaDraft({ ...areaDraft, to: tile });
  }

  function finishArea() {
    if (!areaDraft) return;
    setObstructionsValue([
      ...obstructions,
      { id: nextObstructionId(obstructions), kind: "roof_window", proposed: false, ...areaFromDraft(areaDraft) },
    ]);
    setAreaDraft(null);
    setConfirmed(false);
  }

  function confirm() {
    setConfirmed(true);
    setQueue((current) => current.map((q) => (q.status === "open" ? { ...q, status: "done" } : q)));
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
      warnings: [...(photo?.warnings ?? []), ...tileWarnings, ...result.warnings],
      tileSize,
      corners: quad,
      obstructions,
      panels: plan ? { spec: planner.panelSpec, layout: planner.layoutOptions, plan } : undefined,
    };
  }

  async function exportAs(format: ExportFormat, language: Language) {
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
    if (format === "dxf") {
      downloadBlob(new Blob([toDxf(report)], { type: "application/dxf" }), `${baseName}.dxf`);
      return;
    }
    const canvas = annotatedCanvas(
      photo.canvas,
      report.corners,
      report.rows,
      report.columns,
      obstructions,
      panelShapes.map((p) => p.outline),
    );
    if (format === "png") {
      downloadBlob(await canvasToBlob(canvas, "image/png"), `${baseName}.png`);
      return;
    }
    const jpeg = new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg")).arrayBuffer());
    const pdf = toPdf(report, jpeg, canvas.width, canvas.height, language);
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
    tileWarnings,
    dimensions,
    obstructions,
    grid,
    obstructionShapes: draftShape ? [...obstructionShapes, draftShape] : obstructionShapes,
    planner,
    panelProblem,
    queue,
    nextQueued,
    drawingArea,
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
    setCaseReference: edit(setCaseReferenceValue),
    setRoofSurface: edit(setRoofSurfaceValue),
    setQuad,
    invalidate,
    commitQuad,
    addFiles,
    addDrop,
    openQueued,
    setDrawingArea,
    beginArea,
    extendArea,
    finishArea,
    loadSample,
    startOver,
    detectObstructions,
    confirm,
    exportAs,
  };
}

export type Workspace = ReturnType<typeof useWorkspace>;
