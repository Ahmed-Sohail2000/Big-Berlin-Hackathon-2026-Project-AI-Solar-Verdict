// scripts/tile-accuracy-report.ts
// Measures counting accuracy on the client's reference photos, for §7 of the
// briefing. Reads a manifest, runs the real pipeline, prints the deviation from
// the manual count per quality level.
//
//   pnpm accuracy <manifest.json>
//
// Manifest paths are relative to the manifest. Keep manifests and photos outside
// the repo: they are personal data.
//   [{ "photo": "poor/roof1.jpg", "quality": "poor", "rows": 30, "columns": 60,
//      "corners": [{ "x": 0, "y": 0 }, { "x": 1, "y": 0 }, { "x": 1, "y": 1 }, { "x": 0, "y": 1 }] }]
// Leave out "corners" to measure the automatic roof detection as well.
//
// A low-confidence count scores as "no count returned", because the app leaves the
// fields empty in that case and the employee never sees the number.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { countTiles } from "../lib/tile-count/vision/count";
import { heuristicRoofDetector } from "../lib/tile-count/vision/detect-roof";
import { toGray } from "../lib/tile-count/vision/rectify";
import type { Quad } from "../lib/tile-count/types";

export interface ManifestEntry {
  photo: string;
  quality: "poor" | "acceptable" | "optimal";
  rows: number;
  columns: number;
  corners?: Quad;
}

export interface Outcome {
  entry: ManifestEntry;
  rowError: number | null;
  columnError: number | null;
  level: string;
  /** Wrong by more than one tile while claiming high confidence: the failure that must not happen. */
  falseConfidence: boolean;
}

async function evaluate(entry: ManifestEntry, base: string): Promise<Outcome> {
  const { data, info } = await sharp(resolve(base, entry.photo))
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
  const corners = entry.corners ?? heuristicRoofDetector.detect(pixels).quad;

  const result = countTiles(toGray(pixels), corners);
  const shown = (count: number | null) => (result.level === "low" ? null : count);
  const rows = shown(result.rows.count);
  const columns = shown(result.columns.count);
  const rowError = rows === null ? null : rows - entry.rows;
  const columnError = columns === null ? null : columns - entry.columns;
  const worst = Math.max(Math.abs(rowError ?? 0), Math.abs(columnError ?? 0));
  return {
    entry,
    rowError,
    columnError,
    level: result.level,
    falseConfidence: result.level === "high" && worst > 1,
  };
}

/** Runs every manifest entry through the real pipeline. Paths are relative to the manifest. */
export async function evaluateManifest(manifestPath: string): Promise<Outcome[]> {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestEntry[];
  const base = dirname(resolve(manifestPath));
  const outcomes: Outcome[] = [];
  for (const entry of manifest) outcomes.push(await evaluate(entry, base));
  return outcomes;
}

function summarise(quality: string, outcomes: Outcome[]) {
  const counted = outcomes.filter((o) => o.rowError !== null && o.columnError !== null);
  const within = (tolerance: number) =>
    counted.filter((o) => Math.abs(o.rowError!) <= tolerance && Math.abs(o.columnError!) <= tolerance).length;
  const meanError =
    counted.reduce((sum, o) => sum + Math.abs(o.rowError!) + Math.abs(o.columnError!), 0) /
    (2 * (counted.length || 1));

  console.log(`\n${quality} (${outcomes.length} photos)`);
  console.log(`  exact:             ${within(0)}/${outcomes.length}`);
  console.log(`  within 1 tile:     ${within(1)}/${outcomes.length}`);
  console.log(`  mean deviation:    ${meanError.toFixed(2)} tiles`);
  console.log(`  no count returned: ${outcomes.length - counted.length}`);
  console.log(`  wrong but "high":  ${outcomes.filter((o) => o.falseConfidence).length}`);
}

async function main() {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: pnpm accuracy <manifest.json>");
    process.exit(1);
  }
  const outcomes = await evaluateManifest(manifestPath);

  for (const quality of ["optimal", "acceptable", "poor"] as const) {
    const group = outcomes.filter((o) => o.entry.quality === quality);
    if (group.length > 0) summarise(quality, group);
  }
}

if (process.argv[1]?.endsWith("tile-accuracy-report.ts")) void main();
