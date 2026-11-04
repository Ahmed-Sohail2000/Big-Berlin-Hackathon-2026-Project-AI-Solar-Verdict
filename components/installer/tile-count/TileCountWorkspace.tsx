"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Download, Loader2, Upload } from "lucide-react";
import { countTiles } from "@/lib/tile-count/count";
import { heuristicRoofDetector } from "@/lib/tile-count/detect-roof";
import { computeDimensions, validateTileSize } from "@/lib/tile-count/dimensions";
import { toCsv, toJson, toPdf, type TileReport } from "@/lib/tile-count/export";
import { isValidQuad } from "@/lib/tile-count/homography";
import { proposeObstructions, validateObstruction } from "@/lib/tile-count/obstructions";
import { rectifiedSize, rectify, toGray } from "@/lib/tile-count/rectify";
import type {
  ConfidenceLevel,
  GrayImage,
  Obstruction,
  Quad,
  TileCountResult,
  TileSize,
} from "@/lib/tile-count/types";
import { annotatedCanvas, canvasToBlob, downloadBlob } from "./annotate";
import { decodePhoto } from "./decode";
import { BUTTON_CLASS, Field, INPUT_CLASS, NumberField, Section } from "./fields";
import { ObstructionEditor } from "./ObstructionEditor";
import { RoofOverlay } from "./RoofOverlay";
import { RulerCalibration } from "./RulerCalibration";

interface Photo {
  canvas: HTMLCanvasElement;
  gray: GrayImage;
}

const LEVEL_STYLE: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: "High confidence", className: "border-[#62E6A7]/40 text-[#62E6A7]" },
  medium: { label: "Medium confidence, check the grid", className: "border-[#F2B84B]/40 text-[#F2B84B]" },
  low: { label: "Not reliable", className: "border-[#F2B84B]/40 text-[#F2B84B]" },
};

function parseCount(value: string): number | null {
  const count = Number(value);
  return value !== "" && Number.isInteger(count) && count > 0 ? count : null;
}

/** A low-confidence count is not offered as a value; the employee has to enter it. */
function suggestedCount(count: number | null, level: ConfidenceLevel): string {
  return count !== null && level !== "low" ? String(count) : "";
}

/** Upload, review, correct, confirm, export. Runs entirely in the browser. */
export function TileCountWorkspace() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [result, setResult] = useState<TileCountResult | null>(null);
  const [rows, setRows] = useState("");
  const [columns, setColumns] = useState("");
  const [obstructions, setObstructions] = useState<Obstruction[]>([]);
  const [tile, setTile] = useState({ height: "", width: "", headLap: "", sideLap: "0", spacing: "" });
  const [caseReference, setCaseReference] = useState("");
  const [roofSurface, setRoofSurface] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showRuler, setShowRuler] = useState(false);

  const rowCount = parseCount(rows);
  const columnCount = parseCount(columns);

  const tileSize: TileSize = {
    heightMm: Number(tile.height),
    widthMm: Number(tile.width),
    headLapMm: Number(tile.headLap),
    sideLapMm: Number(tile.sideLap),
    rowSpacingMm: tile.spacing === "" ? undefined : Number(tile.spacing),
  };
  const tileErrors = validateTileSize(tileSize);
  const dimensions =
    rowCount !== null && columnCount !== null && tileErrors.length === 0
      ? computeDimensions(rowCount, columnCount, tileSize)
      : null;

  const pendingProposals = obstructions.filter((o) => o.proposed).length;
  const obstructionsValid = useMemo(
    () =>
      rowCount !== null &&
      columnCount !== null &&
      obstructions.every((o) => validateObstruction(o, rowCount, columnCount) === null),
    [obstructions, rowCount, columnCount],
  );
  const blocker =
    (!dimensions && (tileErrors[0] ?? "Enter the tiles high and wide.")) ||
    (pendingProposals > 0 && `Accept or remove ${pendingProposals} proposed area(s).`) ||
    (!obstructionsValid && "Fix the obstruction areas first.") ||
    null;

  function applyCount(next: TileCountResult) {
    setResult(next);
    setRows(suggestedCount(next.rows.count, next.level));
    setColumns(suggestedCount(next.columns.count, next.level));
    setConfirmed(false);
  }

  /** Yields to the browser first so the busy state paints before the heavy work starts. */
  function runCount(gray: GrayImage, corners: Quad) {
    setBusy(true);
    setTimeout(() => {
      applyCount(countTiles(gray, corners));
      setBusy(false);
    }, 0);
  }

  async function loadPhoto(file: File) {
    setBusy(true);
    setError(null);
    setPhoto(null);
    setResult(null);
    setRows("");
    setColumns("");
    setObstructions([]);
    setConfirmed(false);
    try {
      const { canvas, pixels } = await decodePhoto(file);
      const gray = toGray(pixels);
      const { quad: proposed } = heuristicRoofDetector.detect(pixels);
      setPhoto({ canvas, gray });
      setQuad(proposed);
      runCount(gray, proposed);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This file could not be read.");
      setBusy(false);
    }
  }

  function detectObstructions() {
    if (!photo || !quad || rowCount === null || columnCount === null) return;
    const { width, height } = rectifiedSize(quad);
    const flat = rectify(photo.gray, quad, width, height);
    if (!flat) return;
    const manual = obstructions.filter((o) => !o.proposed);
    setObstructions([...manual, ...proposeObstructions(flat, rowCount, columnCount)]);
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
    };
  }

  const baseName = `tile-count-${(caseReference || "roof").replace(/[^\w-]+/g, "-")}`;

  async function exportAs(format: "json" | "csv" | "png" | "pdf") {
    const report = buildReport();
    if (!report || !photo) return;
    if (format === "json") {
      downloadBlob(new Blob([toJson(report)], { type: "application/json" }), `${baseName}.json`);
    } else if (format === "csv") {
      downloadBlob(new Blob([toCsv(report)], { type: "text/csv" }), `${baseName}.csv`);
    } else {
      const canvas = annotatedCanvas(photo.canvas, report.corners, report.rows, report.columns, obstructions);
      if (format === "png") {
        downloadBlob(await canvasToBlob(canvas, "image/png"), `${baseName}.png`);
      } else {
        const jpeg = new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg")).arrayBuffer());
        const pdf = toPdf(report, jpeg, canvas.width, canvas.height);
        downloadBlob(new Blob([pdf.slice()], { type: "application/pdf" }), `${baseName}.pdf`);
      }
    }
  }

  const edited = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setConfirmed(false);
  };
  const editTile = (key: keyof typeof tile) => (value: string) => {
    setTile((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
  };
  const level = result ? LEVEL_STYLE[result.level] : null;
  const unreliableEstimate =
    result?.level === "low" && result.rows.count !== null && result.columns.count !== null
      ? `Unreliable estimate: ${result.rows.count} high, ${result.columns.count} wide. Verify the grid or count by hand.`
      : null;

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-[#F7F8FA]">
      <header className="flex items-center gap-4 border-b border-[#2A3038] px-6 py-4">
        <a href="/installer" className="flex items-center gap-1 text-sm text-[#9BA3AF] hover:text-[#F7F8FA]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Installer
        </a>
        <h1 className="text-base font-semibold tracking-tight">Roof tile count</h1>
        <span className="text-xs text-[#9BA3AF]">Photos are processed on this device and are not uploaded.</span>
      </header>

      <main className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className={`${BUTTON_CLASS} cursor-pointer`}>
              <Upload className="mr-1.5 inline h-4 w-4" aria-hidden />
              {photo ? "Replace photo" : "Upload roof photo"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.heif,.pdf"
                aria-label="Roof photo"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void loadPhoto(file);
                  event.target.value = "";
                }}
              />
            </label>
            {busy && (
              <span className="flex items-center gap-1.5 text-sm text-[#9BA3AF]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Counting
              </span>
            )}
            {photo && !busy && (
              <span className="text-xs text-[#9BA3AF]">
                Drag the corners onto the roof edges. The count updates when you let go.
              </span>
            )}
          </div>
          {error && <p className="text-sm text-[#F2B84B]">{error}</p>}
          {photo && quad ? (
            <RoofOverlay
              photo={photo.canvas}
              quad={quad}
              rows={rowCount}
              columns={columnCount}
              obstructions={obstructions}
              onQuadChange={(next) => {
                setQuad(next);
                setConfirmed(false);
              }}
              onQuadCommit={(next) => {
                setQuad(next);
                if (isValidQuad(next)) runCount(photo.gray, next);
                else applyCount(countTiles(photo.gray, next));
              }}
            />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-[#2A3038] text-sm text-[#9BA3AF]">
              JPEG, PNG, HEIC or PDF. One photo per roof surface.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Tile size (mm)">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Tile height" value={tile.height} onChange={editTile("height")} />
              <NumberField label="Tile width" value={tile.width} onChange={editTile("width")} />
              <NumberField
                label="Overlap"
                value={tile.headLap}
                onChange={editTile("headLap")}
                disabled={tile.spacing !== ""}
              />
              <NumberField label="Side overlap" value={tile.sideLap} onChange={editTile("sideLap")} />
              <NumberField label="Row spacing (optional)" value={tile.spacing} onChange={editTile("spacing")} />
            </div>
            <button
              type="button"
              className="mt-3 text-xs text-[#3DAEFF] underline"
              onClick={() => setShowRuler((shown) => !shown)}
            >
              {showRuler ? "Hide reference photo" : "Measure from a reference photo"}
            </button>
            {showRuler && (
              <div className="mt-3">
                <RulerCalibration
                  onMeasured={(height, width) => {
                    setTile((current) => ({ ...current, height: String(height), width: String(width) }));
                    setConfirmed(false);
                  }}
                />
              </div>
            )}
          </Section>

          <Section title="Result">
            {level && (
              <p className={`mb-3 inline-block rounded-md border px-2 py-1 text-xs font-medium ${level.className}`}>
                {level.label}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Tiles high" value={rows} onChange={edited(setRows)} />
              <NumberField label="Tiles wide" value={columns} onChange={edited(setColumns)} />
            </div>
            {unreliableEstimate && <p className="mt-3 text-xs text-[#F2B84B]">{unreliableEstimate}</p>}
            {result?.warnings.map((warning) => (
              <p key={warning} className="mt-2 flex gap-1.5 text-xs text-[#F2B84B]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {warning}
              </p>
            ))}
            {dimensions && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-[#9BA3AF]">Height</dt>
                  <dd>{dimensions.heightM.toFixed(2)} m</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#9BA3AF]">Width</dt>
                  <dd>{dimensions.widthM.toFixed(2)} m</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#9BA3AF]">Area</dt>
                  <dd>{dimensions.areaM2.toFixed(2)} m²</dd>
                </div>
              </dl>
            )}
          </Section>

          <Section title="Obstruction areas">
            <ObstructionEditor
              obstructions={obstructions}
              rows={rowCount}
              columns={columnCount}
              onChange={(next) => {
                setObstructions(next);
                setConfirmed(false);
              }}
              onDetect={detectObstructions}
            />
          </Section>

          <Section title="Confirm and export">
            <div className="space-y-3">
              <Field label="Customer case reference">
                <input
                  className={INPUT_CLASS}
                  maxLength={80}
                  value={caseReference}
                  onChange={(event) => edited(setCaseReference)(event.target.value)}
                />
              </Field>
              <Field label="Roof surface">
                <input
                  className={INPUT_CLASS}
                  maxLength={80}
                  value={roofSurface}
                  onChange={(event) => edited(setRoofSurface)(event.target.value)}
                />
              </Field>
              {blocker && photo && <p className="text-xs text-[#F2B84B]">{blocker}</p>}
              <button
                type="button"
                className={BUTTON_CLASS}
                disabled={!photo || !quad || Boolean(blocker) || confirmed}
                onClick={() => setConfirmed(true)}
              >
                {confirmed ? "Confirmed" : "Confirm result"}
              </button>
              <div className="flex flex-wrap gap-2">
                {(["pdf", "png", "csv", "json"] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    className={BUTTON_CLASS}
                    disabled={!confirmed}
                    onClick={() => void exportAs(format)}
                  >
                    <Download className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
