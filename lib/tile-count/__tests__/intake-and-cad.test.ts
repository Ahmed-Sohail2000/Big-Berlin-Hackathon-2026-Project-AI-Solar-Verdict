import { describe, expect, it } from "vitest";
import { toDxf } from "../io/dxf";
import { toCsv, toJson, toPdf, type TileReport } from "../io/export";
import {
  checkUpload,
  declaredSize,
  looksTruncated,
  MAX_FOLDER_FILES,
  screenFolder,
  type FolderEntry,
} from "../io/upload";
import { summarisePlan } from "../planning/panel-plan";
import { DEFAULT_LAYOUT, type PanelSpec } from "../planning/panels";
import { tileSizeWarnings, validateTileSize } from "../planning/dimensions";
import { assessPhoto } from "../vision/photo-quality";
import { rectangleQuad } from "../vision/rectify";

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

/** SOI, an APP1 block that must be skipped, then a baseline frame header. */
function jpegHeader(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4,
    0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 3, 0, 0, 0, 0, 0, 0, 0,
  ]);
}

const JPEG_END = new Uint8Array([0xff, 0xd9]);
const entry = (name: string, patch: Partial<FolderEntry> = {}): FolderEntry => ({
  name,
  sizeBytes: 1000,
  head: jpegHeader(4000, 3000),
  tail: JPEG_END,
  ...patch,
});

describe("upload safety", () => {
  it("reads declared pixel sizes without decoding", () => {
    expect(declaredSize(pngHeader(4032, 3024))).toEqual({ width: 4032, height: 3024 });
    expect(declaredSize(jpegHeader(4032, 3024))).toEqual({ width: 4032, height: 3024 });
  });

  it("refuses a small file that declares an enormous image", () => {
    expect(checkUpload(1000, pngHeader(30000, 30000))).toContain("900 megapixels");
    expect(checkUpload(1000, jpegHeader(60000, 60000))).toContain("megapixels");
    expect(checkUpload(1000, pngHeader(8000, 6000))).toBeNull();
  });

  it("notices a file cut short", () => {
    expect(looksTruncated("jpeg", new Uint8Array([1, 2, 3]))).toBe(true);
    expect(looksTruncated("jpeg", JPEG_END)).toBe(false);
    expect(looksTruncated("png", new TextEncoder().encode("xxIENDxxxx"))).toBe(false);
    expect(looksTruncated("png", new Uint8Array(12))).toBe(true);
    expect(looksTruncated("pdf", new Uint8Array(4))).toBe(false);
  });
});

describe("screenFolder", () => {
  it("passes photos, explains refusals and skips system files", () => {
    const screened = screenFolder([
      entry("south.jpg"),
      entry("Thumbs.db"),
      entry(".DS_Store"),
      entry("offer.docx", { head: new TextEncoder().encode("PK\x03\x04 not a photo") }),
      entry("huge.jpg", { sizeBytes: 31 * 1024 * 1024 }),
    ]);
    expect(screened.map((s) => s.name)).toEqual(["south.jpg", "offer.docx", "huge.jpg"]);
    expect(screened[0].problem).toBeNull();
    expect(screened[1].problem).toContain("JPEG");
    expect(screened[2].problem).toContain("30 MB");
  });

  it("keeps each file's original position, past skipped files", () => {
    expect(screenFolder([entry("Thumbs.db"), entry("south.jpg")])[0].index).toBe(1);
  });

  it("flags duplicates and incomplete files", () => {
    const [first, copy, cut] = screenFolder([
      entry("a.jpg"),
      entry("a.jpg"),
      entry("b.jpg", { tail: new Uint8Array(4) }),
    ]);
    expect(first.problem).toBeNull();
    expect(copy.problem).toContain("Same name");
    expect(cut.problem).toBeNull();
    expect(cut.notice).toContain("incomplete");
  });

  it("caps how many files it will check", () => {
    const many = Array.from({ length: MAX_FOLDER_FILES + 3 }, (_, i) => entry(`${i}.jpg`));
    const screened = screenFolder(many);
    expect(screened.filter((s) => s.problem === null)).toHaveLength(MAX_FOLDER_FILES);
    expect(screened.at(-1)!.problem).toContain("first 50");
  });
});

describe("tile size guards", () => {
  const size = { heightMm: 420, widthMm: 330, headLapMm: 70, sideLapMm: 30 };

  it("refuses a blank overlap instead of treating it as zero", () => {
    expect(validateTileSize({ ...size, headLapMm: Number.NaN })[0]).toContain("overlap");
    expect(validateTileSize({ ...size, sideLapMm: Number.NaN })[0]).toContain("side overlap");
  });

  it("does not need an overlap when the row spacing is known", () => {
    expect(validateTileSize({ ...size, headLapMm: Number.NaN, rowSpacingMm: 350 })).toEqual([]);
  });

  it("warns about values that look like centimetres", () => {
    expect(tileSizeWarnings(size)).toEqual([]);
    const centimetres = { heightMm: 42, widthMm: 33, headLapMm: 7, sideLapMm: 3 };
    expect(tileSizeWarnings(centimetres)).toHaveLength(2);
  });
});

describe("assessPhoto", () => {
  const image = (width: number, height: number, value: number) => ({
    width,
    height,
    data: new Float32Array(width * height).fill(value),
  });

  it("accepts a normal photo", () => {
    expect(assessPhoto(image(1600, 1200, 0.5))).toEqual([]);
  });

  it("warns about small, dark and overexposed photos", () => {
    expect(assessPhoto(image(640, 480, 0.5))[0]).toContain("640 x 480");
    expect(assessPhoto(image(1600, 1200, 0.05))[0]).toContain("dark");
    expect(assessPhoto(image(1600, 1200, 0.98))[0]).toContain("overexposed");
  });
});

const SPEC: PanelSpec = { name: "Test", lengthMm: 1800, widthMm: 1200, wattsPeak: 400 };
const TILE = { heightMm: 420, widthMm: 330, headLapMm: 70, sideLapMm: 30 };
const PLANNED = [{ xMm: 600, yMm: 700, widthMm: 1200, heightMm: 1800 }];
const REPORT: TileReport = {
  caseReference: "Case\r\n  0\r\nEOF",
  roofSurface: "South",
  generatedAt: "2026-11-05T10:00:00.000Z",
  rows: 20,
  columns: 36,
  correctedByEmployee: false,
  confidence: "high",
  warnings: [],
  tileSize: TILE,
  corners: rectangleQuad(100, 100),
  obstructions: [{ id: "a", kind: "roof_window", fromBottom: 10, fromLeft: 20, widthTiles: 4, heightTiles: 5, proposed: false }],
  panels: { spec: SPEC, layout: DEFAULT_LAYOUT, plan: summarisePlan("manual", PLANNED, SPEC, 20, 36, TILE) },
};

/** Group-code pairs, the structure every DXF reader sees. */
function pairs(dxf: string): [number, string][] {
  const lines = dxf.split("\r\n");
  const out: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) out.push([Number(lines[i]), lines[i + 1]]);
  return out;
}

/** The vertices of each closed polyline on a layer. */
function polylines(dxf: string, layer: string): number[][][] {
  const items = pairs(dxf);
  const found: number[][][] = [];
  items.forEach(([code, value], i) => {
    if (code !== 0 || value !== "POLYLINE" || items[i + 1][1] !== layer) return;
    const points: number[][] = [];
    for (let j = i + 1; items[j][1] !== "SEQEND"; j++) {
      if (items[j][0] === 0 && items[j][1] === "VERTEX") points.push([Number(items[j + 2][1]), Number(items[j + 3][1])]);
    }
    found.push(points);
  });
  return found;
}

describe("toDxf", () => {
  const dxf = toDxf(REPORT);

  it("is structurally complete", () => {
    const items = pairs(dxf);
    expect(items.every(([code]) => Number.isInteger(code))).toBe(true);
    expect(items.filter(([c, v]) => c === 0 && v === "SECTION")).toHaveLength(3);
    expect(items.filter(([c, v]) => c === 0 && v === "ENDSEC")).toHaveLength(3);
    expect(items.at(-1)).toEqual([0, "EOF"]);
    expect(items.filter(([, v]) => v === "POLYLINE")).toHaveLength(items.filter(([, v]) => v === "SEQEND").length);
  });

  it("draws the roof at true scale in millimetres", () => {
    // 36 tiles x 300 mm cover, 20 rows x 350 mm exposed.
    expect(polylines(dxf, "ROOF")).toEqual([[[0, 0], [10800, 0], [10800, 7000], [0, 7000]]]);
  });

  it("draws one grid line per tile boundary", () => {
    const lines = pairs(dxf).filter(([c, v]) => c === 8 && v === "TILE_GRID");
    expect(lines).toHaveLength(19 + 35);
  });

  it("places obstructions and panels where the tile positions say", () => {
    expect(polylines(dxf, "OBSTRUCTIONS")[0][0]).toEqual([6000, 3500]);
    expect(polylines(dxf, "OBSTRUCTIONS")[0][2]).toEqual([7200, 5250]);
    expect(polylines(dxf, "PANELS")[0][2]).toEqual([1800, 2500]);
  });

  it("carries no free text, so a crafted case reference cannot change the file", () => {
    expect(dxf).not.toContain("Case");
    expect(pairs(dxf).filter(([c, v]) => c === 0 && v === "EOF")).toHaveLength(1);
  });

  it("leaves panels out when the employee chose counts only", () => {
    expect(polylines(toDxf({ ...REPORT, panels: undefined }), "PANELS")).toEqual([]);
  });

  it("is deterministic", () => {
    expect(toDxf(REPORT)).toBe(dxf);
  });
});

describe("panel data in the other exports", () => {
  it("records whether the employee placed the panels", () => {
    expect(JSON.parse(toJson(REPORT)).panels.plan.mode).toBe("manual");
    expect(toCsv(REPORT)).toContain('"panel_layout","manual"');
  });

  it("lists panel positions in tiles in the CSV", () => {
    expect(toCsv(REPORT)).toContain('"2","2","1200","1800"');
  });

  it("keeps the image on the page when the report is very long", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ ...REPORT.obstructions[0], id: `o${i}` }));
    const text = String.fromCharCode(...toPdf({ ...REPORT, obstructions: many }, new Uint8Array(4), 800, 600));
    const placement = /q ([\d.]+) 0 0 ([\d.]+) 40 ([\d.]+) cm/.exec(text);
    expect(Number(placement![1])).toBeGreaterThan(100);
    expect(Number(placement![3])).toBeGreaterThanOrEqual(39);
  });
});
