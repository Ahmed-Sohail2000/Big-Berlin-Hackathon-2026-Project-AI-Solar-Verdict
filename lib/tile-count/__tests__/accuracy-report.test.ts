// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { evaluateManifest } from "../../../scripts/tile-accuracy-report";
import { rectangleQuad } from "../rectify";
import { renderRoof } from "../synthetic-roof";

describe("accuracy report", () => {
  it("scores a photo against its manual count", async () => {
    const directory = mkdtempSync(join(tmpdir(), "tile-accuracy-"));
    try {
      const roof = renderRoof({ rows: 14, columns: 22 });
      const pixels = Buffer.from(Array.from(roof.data, (v) => Math.round(Math.min(1, Math.max(0, v)) * 255)));
      await sharp(pixels, { raw: { width: roof.width, height: roof.height, channels: 1 } })
        .png()
        .toFile(join(directory, "roof.png"));
      const entry = (rows: number) => ({
        photo: "roof.png",
        quality: "optimal",
        rows,
        columns: 22,
        corners: rectangleQuad(roof.width, roof.height),
      });
      const manifest = join(directory, "manifest.json");
      writeFileSync(manifest, JSON.stringify([entry(14), entry(11)]));

      const [exact, wrong] = await evaluateManifest(manifest);
      expect(exact).toMatchObject({ rowError: 0, columnError: 0, falseConfidence: false });
      expect(wrong).toMatchObject({ rowError: 3, falseConfidence: exact.level === "high" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
