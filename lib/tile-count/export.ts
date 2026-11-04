// lib/tile-count/export.ts
// Confirmed results as JSON, CSV and a one-page PDF for the CAD workflow.
// PURE, DETERMINISTIC, no I/O: the caller supplies the timestamp and the image.

import { computeDimensions } from "./dimensions";
import { describeObstruction } from "./obstructions";
import type { ConfidenceLevel, Obstruction, Quad, TileSize } from "./types";

export interface TileReport {
  /** Free-text customer case reference. Exports carry nothing else about the customer. */
  caseReference: string;
  roofSurface: string;
  generatedAt: string;
  rows: number;
  columns: number;
  /** True when the employee changed the AI count by hand. */
  correctedByEmployee: boolean;
  confidence: ConfidenceLevel;
  warnings: string[];
  tileSize: TileSize;
  corners: Quad;
  obstructions: Obstruction[];
}

export function toJson(report: TileReport): string {
  const dimensions = computeDimensions(report.rows, report.columns, report.tileSize);
  return JSON.stringify({ ...report, dimensions }, null, 2);
}

/** Quotes a CSV field and defuses spreadsheet formula injection from free text. */
function csvField(value: string | number): string {
  const text = String(value);
  const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(report: TileReport): string {
  const d = computeDimensions(report.rows, report.columns, report.tileSize);
  const lines: (string | number)[][] = [
    ["field", "value"],
    ["case_reference", report.caseReference],
    ["roof_surface", report.roofSurface],
    ["generated_at", report.generatedAt],
    ["tiles_high", report.rows],
    ["tiles_wide", report.columns],
    ["height_m", d.heightM],
    ["width_m", d.widthM],
    ["area_m2", d.areaM2],
    ["exposed_height_mm", d.exposedHeightMm],
    ["cover_width_mm", d.coverWidthMm],
    ["confidence", report.confidence],
    ["corrected_by_employee", String(report.correctedByEmployee)],
  ];
  const table = lines.map((line) => line.map(csvField).join(",")).join("\r\n");

  const obstructionHeader = "kind,from_bottom,from_left,width_tiles,height_tiles";
  const obstructionRows = report.obstructions.map((o) =>
    [o.kind, o.fromBottom, o.fromLeft, o.widthTiles, o.heightTiles].map(csvField).join(","),
  );
  return [table, "", obstructionHeader, ...obstructionRows].join("\r\n") + "\r\n";
}

/** Escapes text for a PDF string and keeps it inside the WinAnsi range of the base font. */
function pdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function latin1Bytes(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

function reportLines(report: TileReport): string[] {
  const d = computeDimensions(report.rows, report.columns, report.tileSize);
  return [
    `Case: ${report.caseReference || "-"}    Surface: ${report.roofSurface || "-"}`,
    `Generated: ${report.generatedAt}`,
    `Tiles: ${report.rows} high, ${report.columns} wide`,
    `Outer dimensions: ${d.heightM.toFixed(2)} m high, ${d.widthM.toFixed(2)} m wide (${d.areaM2.toFixed(2)} m2)`,
    `Tile: exposed height ${d.exposedHeightMm} mm, cover width ${d.coverWidthMm} mm`,
    `Confidence: ${report.confidence}${report.correctedByEmployee ? " (count corrected by employee)" : ""}`,
    ...report.obstructions.map((o) => `${o.kind.replace(/_/g, " ")}: ${describeObstruction(o)}`),
    ...report.warnings.map((w) => `Warning: ${w}`),
  ];
}

/**
 * Minimal one-page A4 PDF: report text above the annotated photo. Written by hand
 * because a JPEG can be embedded as-is (DCTDecode), which avoids a PDF-writing
 * dependency for a single fixed layout.
 */
export function toPdf(
  report: TileReport,
  jpeg: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 40;
  const lines = reportLines(report);
  const textTop = pageHeight - margin - 22;
  const textBottom = textTop - 16 - lines.length * 13;

  const maxWidth = pageWidth - 2 * margin;
  const maxHeight = textBottom - margin;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  const text = [
    "BT",
    `/F1 14 Tf ${margin} ${textTop} Td (Roof tile count) Tj`,
    "/F1 9 Tf 0 -18 Td 13 TL",
    ...lines.map((line) => `(${pdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const content = `${text}\nq ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${margin} ${(textBottom - drawHeight).toFixed(2)} cm /Im0 Do Q`;

  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (bytes: Uint8Array) => {
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = length;
    push(latin1Bytes(`${id} 0 obj\n${body}\nendobj\n`));
  };

  push(latin1Bytes("%PDF-1.4\n"));
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> /XObject << /Im0 6 0 R >> >> >>`,
  );
  object(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  object(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  offsets[6] = length;
  push(
    latin1Bytes(
      `6 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    ),
  );
  push(jpeg);
  push(latin1Bytes("\nendstream\nendobj\n"));

  const xrefStart = length;
  const entries = offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  push(
    latin1Bytes(
      `xref\n0 7\n0000000000 65535 f \n${entries}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
    ),
  );

  const output = new Uint8Array(length);
  let position = 0;
  for (const part of parts) {
    output.set(part, position);
    position += part.length;
  }
  return output;
}
