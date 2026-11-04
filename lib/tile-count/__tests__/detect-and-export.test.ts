import { describe, expect, it } from "vitest";
import { heuristicRoofDetector } from "../detect-roof";
import { toCsv, toJson, toPdf, type TileReport } from "../export";
import { gridLines, obstructionOutline } from "../grid";
import { describeObstruction, proposeObstructions, validateObstruction } from "../obstructions";
import { rectangleQuad } from "../rectify";
import type { Obstruction, Quad } from "../types";
import { checkUpload, MAX_UPLOAD_BYTES, sniffPhotoFormat } from "../upload";
import { colourScene, renderRoof } from "../synthetic-roof";

const REPORT: TileReport = {
  caseReference: "Case 123",
  roofSurface: "South",
  generatedAt: "2026-11-05T10:00:00.000Z",
  rows: 30,
  columns: 60,
  correctedByEmployee: false,
  confidence: "high",
  warnings: [],
  tileSize: { heightMm: 420, widthMm: 330, headLapMm: 70, sideLapMm: 30 },
  corners: rectangleQuad(100, 100),
  obstructions: [
    {
      id: "a",
      kind: "roof_window",
      fromBottom: 10,
      fromLeft: 20,
      widthTiles: 4,
      heightTiles: 5,
      proposed: false,
    },
  ],
};

describe("heuristicRoofDetector", () => {
  it("finds a red roof between sky and wall", () => {
    const box = { x0: 200, y0: 150, x1: 1000, y1: 650 };
    const { quad, confidence } = heuristicRoofDetector.detect(colourScene(1200, 800, box));
    expect(confidence).toBeGreaterThan(0);
    expect(Math.abs(quad[0].x - box.x0)).toBeLessThan(40);
    expect(Math.abs(quad[0].y - box.y0)).toBeLessThan(40);
    expect(Math.abs(quad[2].x - box.x1)).toBeLessThan(40);
    expect(Math.abs(quad[2].y - box.y1)).toBeLessThan(40);
  });

  it("falls back with zero confidence when nothing looks like a roof", () => {
    const scene = colourScene(600, 400, { x0: 0, y0: 0, x1: 0, y1: 0 });
    expect(heuristicRoofDetector.detect(scene).confidence).toBe(0);
  });
});

describe("obstructions", () => {
  it("locates a blank area in tile coordinates", () => {
    const flat = renderRoof({
      rows: 20,
      columns: 30,
      noise: 0.04,
      obstruction: { row: 5, column: 12, rows: 4, columns: 3 },
    });
    const [found, ...rest] = proposeObstructions(flat, 20, 30);
    expect(rest).toEqual([]);
    expect(found).toMatchObject({
      fromBottom: 11,
      fromLeft: 12,
      widthTiles: 3,
      heightTiles: 4,
      proposed: true,
    });
  });

  it("does not flag moss or shadow", () => {
    const flat = renderRoof({ rows: 20, columns: 30, moss: 10, shadow: true, seed: 5 });
    expect(proposeObstructions(flat, 20, 30)).toEqual([]);
  });

  it("describes a position the way the briefing does", () => {
    expect(describeObstruction(REPORT.obstructions[0])).toBe(
      "10 tiles from the bottom, 20 from the left, 4 wide, 5 high",
    );
  });

  it("rejects areas that leave the roof or are not whole tiles", () => {
    const base: Obstruction = REPORT.obstructions[0];
    expect(validateObstruction(base, 30, 60)).toBeNull();
    expect(validateObstruction({ ...base, fromLeft: 58 }, 30, 60)).toContain("past the counted roof");
    expect(validateObstruction({ ...base, widthTiles: 1.5 }, 30, 60)).toContain("whole numbers");
  });
});

describe("grid", () => {
  const quad: Quad = rectangleQuad(600, 300);

  it("returns one inner line per division", () => {
    expect(gridLines(quad, 3, 6)).toHaveLength(2 + 5);
  });

  it("places an obstruction outline measured from the bottom", () => {
    const outline = obstructionOutline(
      { ...REPORT.obstructions[0], fromBottom: 1, fromLeft: 2, widthTiles: 2, heightTiles: 1 },
      quad,
      3,
      6,
    );
    expect(outline![0].x).toBeCloseTo(200, 6);
    expect(outline![0].y).toBeCloseTo(100, 6);
    expect(outline![2].x).toBeCloseTo(400, 6);
    expect(outline![2].y).toBeCloseTo(200, 6);
  });
});

describe("upload checks", () => {
  const header = (...values: number[]) => new Uint8Array(values);
  const ascii = (text: string) => new TextEncoder().encode(text);

  it("recognises each format from its bytes", () => {
    expect(sniffPhotoFormat(header(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffPhotoFormat(header(0x89, 0x50, 0x4e, 0x47))).toBe("png");
    expect(sniffPhotoFormat(ascii("%PDF-1.7"))).toBe("pdf");
    expect(sniffPhotoFormat(ascii("\0\0\0\x18ftypheic"))).toBe("heic");
  });

  it("rejects anything else, whatever it is named", () => {
    expect(sniffPhotoFormat(ascii("<html><script>"))).toBeNull();
    expect(checkUpload(100, ascii("MZ executable"))).toContain("JPEG");
  });

  it("rejects empty and oversized files", () => {
    const jpeg = header(0xff, 0xd8, 0xff);
    expect(checkUpload(0, jpeg)).toContain("empty");
    expect(checkUpload(MAX_UPLOAD_BYTES + 1, jpeg)).toContain("30 MB");
    expect(checkUpload(1000, jpeg)).toBeNull();
  });
});

describe("exports", () => {
  it("writes JSON with computed dimensions", () => {
    const parsed = JSON.parse(toJson(REPORT));
    expect(parsed.rows).toBe(30);
    expect(parsed.dimensions.heightM).toBe(10.5);
    expect(parsed.dimensions.widthM).toBe(18);
    expect(parsed.obstructions[0].fromLeft).toBe(20);
  });

  it("writes CSV with counts and obstructions", () => {
    const csv = toCsv(REPORT);
    expect(csv).toContain('"tiles_high","30"');
    expect(csv).toContain('"height_m","10.5"');
    expect(csv).toContain('"roof_window","10","20","4","5"');
  });

  it("neutralises spreadsheet formulas in free text", () => {
    const csv = toCsv({ ...REPORT, caseReference: '=HYPERLINK("http://x")' });
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
  });

  it("writes a structurally valid PDF around the image bytes", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = toPdf({ ...REPORT, caseReference: "Case (1) Müller 中" }, jpeg, 800, 600);
    const text = String.fromCharCode(...pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("Case \\(1\\) Müller ?");
    expect(text).toContain("/Filter /DCTDecode");

    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");
    const firstOffset = Number(/\n(\d{10}) 00000 n/.exec(text)![1]);
    expect(text.slice(firstOffset, firstOffset + 7)).toBe("1 0 obj");
  });
});
