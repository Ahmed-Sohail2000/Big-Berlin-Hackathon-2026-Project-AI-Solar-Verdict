// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toCsv, toJson, toPdf, type TileReport } from "../../tile-count/io/export";
import { describePanel } from "../../tile-count/planning/panel-plan";
import { describeObstruction } from "../../tile-count/vision/obstructions";
import { GUIDE } from "../content/guide";
import { LANDING } from "../content/landing";
import { de, en } from "../dictionary";
import { formatNumber, resolveLanguage } from "../language";
import { translateMessage } from "../messages";

const MESSAGE_SOURCES = [
  "lib/tile-count/vision",
  "lib/tile-count/planning",
  "lib/tile-count/io",
  "components/tile-count/state",
  "components/tile-count/browser",
];

/** Every full sentence in the code that can reach the screen, with sample values filled in. */
function sentencesInSource(): string[] {
  const sentences = new Set<string>();
  for (const folder of MESSAGE_SOURCES) {
    for (const name of readdirSync(folder).filter((file) => /\.tsx?$/.test(file))) {
      const code = readFileSync(join(folder, name), "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
        .join("\n");
      for (const [, , text] of code.matchAll(/(["`])([A-Z][^"`\n]* [^"`\n]*\.)\1/g)) {
        sentences.add(
          text
            .replace(/\$\{NO_PATTERN\}/g, "Tile boundaries not reliably detectable")
            .replace(/\$\{label\}/g, "height")
            .replace(/\$\{[^}]*\}/g, "1"),
        );
      }
    }
  }
  return [...sentences];
}

/** Paths and types of a value, so two translations can be compared without their wording. */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  }
  return typeof value;
}

function leaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  return value && typeof value === "object" ? Object.values(value).flatMap(leaves) : [];
}

describe("choosing a language", () => {
  it("prefers the saved choice", () => {
    expect(resolveLanguage("en", "de-DE,de;q=0.9")).toBe("en");
    expect(resolveLanguage("de", "en-US")).toBe("de");
  });

  it("falls back to the browser's first language, then English", () => {
    expect(resolveLanguage(undefined, "de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(resolveLanguage(undefined, "en-US,de;q=0.8")).toBe("en");
    expect(resolveLanguage(undefined, null)).toBe("en");
  });

  it("ignores a forged cookie", () => {
    expect(resolveLanguage("<script>", null)).toBe("en");
    expect(resolveLanguage("__proto__", "de")).toBe("de");
  });
});

describe("number format", () => {
  it("uses the language's decimal mark without changing the value", () => {
    expect(formatNumber(10.8, "en", 2)).toBe("10.80");
    expect(formatNumber(10.8, "de", 2)).toBe("10,80");
    expect(formatNumber(4.5, "de")).toBe("4,5");
    expect(formatNumber(300, "de")).toBe("300");
  });
});

describe("translations", () => {
  it("covers every sentence the code can show", () => {
    const sentences = sentencesInSource();
    expect(sentences.length).toBeGreaterThan(30);
    expect(sentences.filter((sentence) => translateMessage(sentence, "de") === sentence)).toEqual([]);
  });

  it("translates positions, with the decimal comma", () => {
    const area = { kind: "chimney", fromBottom: 10, fromLeft: 20, widthTiles: 4, heightTiles: 5 } as const;
    expect(translateMessage(describeObstruction({ ...area, id: "a", proposed: false }), "de")).toBe(
      "10 Ziegel von unten, 20 von links, 4 breit, 5 hoch",
    );
    expect(translateMessage(describePanel({ fromBottom: 2.5, fromLeft: 3, orientation: "landscape" }), "de")).toBe(
      "2,5 Ziegel von unten, 3 von links, Querformat",
    );
  });

  it("leaves English and unknown text alone", () => {
    expect(translateMessage("This file is empty.", "en")).toBe("This file is empty.");
    expect(translateMessage("Roof 3 north", "de")).toBe("Roof 3 north");
  });

  it("has the same structure in both languages", () => {
    expect(shape(de)).toEqual(shape(en));
    expect(shape(GUIDE.de)).toEqual(shape(GUIDE.en));
    expect(shape(LANDING.de)).toEqual(shape(LANDING.en));
  });

  it("leaves no English sentence in the German copy", () => {
    for (const [german, english] of [
      [GUIDE.de, GUIDE.en],
      [LANDING.de, LANDING.en],
    ]) {
      const source = new Set(leaves(english).filter((text) => text.includes(" ")));
      expect(leaves(german).filter((text) => source.has(text))).toEqual([]);
    }
  });
});

describe("exports", () => {
  const report: TileReport = {
    caseReference: "2026-041",
    roofSurface: "Süd",
    generatedAt: "2026-11-05T10:00:00.000Z",
    rows: 20,
    columns: 36,
    correctedByEmployee: true,
    confidence: "medium",
    warnings: ["This photo is very dark, so tile edges may be lost in shadow."],
    tileSize: { heightMm: 420, widthMm: 330, headLapMm: 70, sideLapMm: 30 },
    corners: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
    obstructions: [
      { id: "a", kind: "chimney", fromBottom: 1, fromLeft: 2, widthTiles: 3, heightTiles: 4, proposed: false },
    ],
  };
  const pdfText = (language: "en" | "de") =>
    Buffer.from(toPdf(report, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 800, 600, language)).toString("latin1");

  it("writes the PDF in the chosen language, with German letters intact", () => {
    const text = pdfText("de");
    expect(text).toContain("Außenmaße: 7,00 m hoch, 10,80 m breit \\(75,60 m²\\)");
    expect(text).toContain("Schornstein: 1 Ziegel von unten");
    expect(text).toContain("Warnung: Dieses Foto ist sehr dunkel.");
    expect(text).toContain("Sicherheit: mittel");
    expect(text).not.toContain("Outer dimensions");
  });

  it("keeps the English PDF wording", () => {
    const text = pdfText("en");
    expect(text).toContain("Outer dimensions: 7.00 m high, 10.80 m wide \\(75.60 m2\\)");
    expect(text).toContain("Chimney: 1 tiles from the bottom");
  });

  it("keeps the data exports in one stable format", () => {
    expect(JSON.parse(toJson(report)).warnings).toEqual(report.warnings);
    expect(toCsv(report)).toContain('"height_m","7"');
  });
});
