import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { toPdf, type TileReport } from "../lib/tile-count/export";
import { photographRoof, renderNoise, renderRoof } from "../lib/tile-count/synthetic-roof";
import type { GrayImage, Quad } from "../lib/tile-count/types";

/** Full flow on synthetic photos. Needs a local server at BASE_URL. */
const ROWS = 20;
const COLUMNS = 36;
const FRAME = { width: 1300, height: 900 };
const CORNERS: Quad = [
  { x: 240, y: 110 },
  { x: 1060, y: 130 },
  { x: 1240, y: 790 },
  { x: 60, y: 770 },
];
const LABELS = ["Top left", "Top right", "Bottom right", "Bottom left"];

/** Tints luminance red and turns the background into sky. */
async function toFile(image: GrayImage, format: "png" | "jpeg"): Promise<Buffer> {
  const rgb = Buffer.alloc(image.width * image.height * 3);
  image.data.forEach((value, i) => {
    const sky = value < 0;
    const level = Math.min(1, Math.max(0, value));
    rgb[i * 3] = sky ? 150 : level * 255;
    rgb[i * 3 + 1] = sky ? 195 : level * 110;
    rgb[i * 3 + 2] = sky ? 240 : level * 90;
  });
  return sharp(rgb, { raw: { width: image.width, height: image.height, channels: 3 } })
    .toFormat(format, { quality: 95 })
    .toBuffer();
}

function roofPhoto(): GrayImage {
  const roof = renderRoof({ rows: ROWS, columns: COLUMNS, moss: 5, noise: 0.06 });
  return photographRoof(roof, CORNERS, FRAME.width, FRAME.height, -1);
}

async function upload(page: Page, name: string, mimeType: string, buffer: Buffer) {
  await page.getByLabel("Roof photo", { exact: true }).setInputFiles({ name, mimeType, buffer });
}

async function dragCornersTo(page: Page, quad: Quad) {
  const overlay = page.locator("svg.touch-none");
  await expect(overlay).toBeVisible({ timeout: 20_000 });
  const box = (await overlay.boundingBox())!;
  for (let i = 0; i < 4; i++) {
    const handle = (await page.getByRole("slider", { name: new RegExp(LABELS[i]) }).boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + (quad[i].x / FRAME.width) * box.width,
      box.y + (quad[i].y / FRAME.height) * box.height,
      { steps: 4 },
    );
    await page.mouse.up();
  }
}

async function fillTileSize(page: Page) {
  await page.getByRole("button", { name: "Tiles", exact: true }).click();
  await page.getByLabel("Tile height").fill("420");
  await page.getByLabel("Tile width").fill("330");
  await page.getByLabel("Overlap", { exact: true }).fill("70");
  await page.getByLabel("Side overlap").fill("30");
}

test.describe("roof tile count", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");
  test.use({ colorScheme: "dark" });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
  });

  test("runs the whole flow to export without sending anything anywhere", async ({ page }) => {
    const outbound: string[] = [];
    const blocked: string[] = [];
    page.on("request", (request) => {
      const local = new URL(request.url()).hostname === "localhost" || request.url().startsWith("blob:");
      if (request.method() !== "GET" || !local) outbound.push(`${request.method()} ${request.url()}`);
    });
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy")) blocked.push(message.text());
    });

    await upload(page, "roof.png", "image/png", await toFile(roofPhoto(), "png"));
    await dragCornersTo(page, CORNERS);
    await expect(page.getByLabel("Tiles high")).toHaveValue(String(ROWS));
    await expect(page.getByLabel("Tiles wide")).toHaveValue(String(COLUMNS));

    await fillTileSize(page);
    await expect(page.getByText("7.00 × 10.80 m")).toBeVisible();

    await page.getByRole("button", { name: "Mark obstructions" }).click();
    await page.getByRole("button", { name: "Recommend panels" }).click();
    await expect(page.getByText(/\d+ panels, \d+\.\d\d kWp/)).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/panels-dark.png", fullPage: true });

    await page.getByRole("button", { name: "Switch between light and dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/panels-light.png", fullPage: true });

    await page.getByRole("button", { name: "Confirm and export" }).click();
    await expect(page.getByRole("button", { name: "JSON" })).toBeDisabled();
    await page.getByRole("button", { name: "Confirm result" }).click();

    const [json] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "JSON" }).click(),
    ]);
    const report = JSON.parse(readFileSync(await json.path(), "utf8"));
    expect(report).toMatchObject({ rows: ROWS, columns: COLUMNS, correctedByEmployee: false });
    expect(report.dimensions.widthM).toBe(10.8);
    expect(report.panels.recommendation.count).toBeGreaterThan(0);

    const [pdf] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "PDF" }).click(),
    ]);
    expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe("%PDF-");

    expect(outbound).toEqual([]);
    expect(blocked).toEqual([]);
  });

  test("editing after confirmation requires confirming again", async ({ page }) => {
    await upload(page, "roof.png", "image/png", await toFile(roofPhoto(), "png"));
    await dragCornersTo(page, CORNERS);
    await fillTileSize(page);
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("button", { name: "Confirm result" }).click();
    await expect(page.getByRole("button", { name: "CSV" })).toBeEnabled();
    await page.getByRole("button", { name: "Roof edges" }).click();
    await page.getByLabel("Tiles wide").fill("35");
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByRole("button", { name: "CSV" })).toBeDisabled();
  });

  test("the sample roof finds its obstruction and requires a decision on it", async ({ page }) => {
    await page.getByRole("button", { name: "Try a sample roof" }).click();
    await expect(page.getByLabel("Tiles high")).toHaveValue("22", { timeout: 20_000 });
    await expect(page.getByLabel("Tiles wide")).toHaveValue("40");
    await page.getByRole("button", { name: "Obstructions", exact: true }).click();
    await page.getByRole("button", { name: "Detect areas" }).click();
    await expect(page.getByText(/11 tiles from the bottom, 26 from the left, 4 wide, 5 high/)).toBeVisible();
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByText("Accept or remove 1 proposed area(s).")).toBeVisible();
  });

  test("warns on a photo with no visible tiles and offers no count", async ({ page }) => {
    await upload(page, "noise.png", "image/png", await toFile(renderNoise(900, 600), "png"));
    await expect(page.getByText("Not reliable")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Tiles high")).toHaveValue("");
  });

  test("reads a roof photo from a PDF", async ({ page }) => {
    const jpeg = await toFile(roofPhoto(), "jpeg");
    const report: TileReport = {
      caseReference: "",
      roofSurface: "",
      generatedAt: "",
      rows: 1,
      columns: 1,
      correctedByEmployee: false,
      confidence: "low",
      warnings: [],
      tileSize: { heightMm: 400, widthMm: 300, headLapMm: 50, sideLapMm: 0 },
      corners: CORNERS,
      obstructions: [],
    };
    const pdf = Buffer.from(toPdf(report, new Uint8Array(jpeg), FRAME.width, FRAME.height));
    await upload(page, "roof.pdf", "application/pdf", pdf);
    await expect(page.locator("svg.touch-none")).toBeVisible({ timeout: 30_000 });
  });

  test("rejects a disguised file", async ({ page }) => {
    await upload(page, "roof.jpg", "image/jpeg", Buffer.from("<html><script>alert(1)</script>"));
    await expect(page.getByText("Use a JPEG, PNG, HEIC or PDF file.")).toBeVisible();
  });

  test("the theme choice survives a reload", async ({ page }) => {
    await page.getByRole("button", { name: "Switch between light and dark theme" }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("serves the guide and the privacy headers", async ({ page }) => {
    const response = await page.goto("/guide");
    await expect(page.getByRole("heading", { name: "How to count a roof" })).toBeVisible();
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toContain("connect-src 'self' blob:");
    expect(csp).toContain("form-action 'none'");
  });
});
