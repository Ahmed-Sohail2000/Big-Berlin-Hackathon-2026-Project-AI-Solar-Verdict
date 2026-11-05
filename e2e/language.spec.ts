import { expect, test } from "@playwright/test";

/** The home page, the way into the tool, and the switch between German and English. */
test.describe("home page and language", () => {
  test.use({ colorScheme: "dark" });

  test("explains the product and leads to the tool", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Exact roof dimensions from one photo" })).toBeVisible();
    for (const name of ["What it is", "What we do", "How it works", "What you get", "What it does not do"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await page.screenshot({ path: "test-results/home-en.png", fullPage: true });

    await page.getByRole("main").getByRole("link", { name: "Open the tool" }).first().click();
    await expect(page).toHaveURL(/\/tool$/);
    await expect(page.getByText("Drop a roof photo or a customer folder here")).toBeVisible();
  });

  test("makes no claim of accuracy on real photos", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/has not yet been measured on real customer photos/)).toBeVisible();
  });

  test("switches every page to German and remembers the choice", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Deutsch" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Exakte Dachmaße aus einem Foto" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await page.screenshot({ path: "test-results/home-de.png", fullPage: true });

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Exakte Dachmaße aus einem Foto" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    await page.getByRole("link", { name: "Anleitung", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "So zählen Sie ein Dach" })).toBeVisible();

    await page.getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "How to count a roof" })).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test.describe("with a German browser", () => {
    test.use({ locale: "de-DE" });

    test("starts in German", async ({ page }) => {
      await page.goto("/tool");
      await expect(page.locator("html")).toHaveAttribute("lang", "de");
      await expect(page.getByText("Dachfoto oder Kundenordner hier ablegen")).toBeVisible();
    });

    test("shows a refused file's reason in German", async ({ page }) => {
      await page.goto("/tool");
      await page
        .getByLabel("Dachfoto", { exact: true })
        .setInputFiles({ name: "roof.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not a photo") });
      await expect(page.getByText("Bitte eine JPEG-, PNG-, HEIC- oder PDF-Datei verwenden.")).toBeVisible();
    });
  });

  test("switching language keeps an open roof, and so does reading the guide", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/tool");
    await page.getByRole("button", { name: "Try a sample roof" }).click();
    await expect(page.getByLabel("Tiles high")).toHaveValue("22", { timeout: 20_000 });
    await expect(page.getByLabel("Tiles wide")).toHaveValue("40");
    await expect(page.getByText(/× 10\.\d\d m|× \d+\.\d\d m/)).toBeVisible();

    await page.getByRole("button", { name: "Deutsch" }).click();
    await expect(page.getByLabel("Ziegel in der Höhe")).toHaveValue("22");
    await expect(page.getByLabel("Ziegel in der Breite")).toHaveValue("40");
    await expect(page.getByText("Beispieldach, kein echtes Foto")).toBeVisible();
    await expect(page.getByText(/× \d+,\d\d m/)).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/tool-de.png", fullPage: true });

    await page.getByRole("link", { name: "Anleitung", exact: true }).click();
    await expect(page.getByRole("heading", { name: "So zählen Sie ein Dach" })).toBeVisible();
    await page.getByRole("link", { name: "Zum Werkzeug" }).click();
    await expect(page.getByLabel("Ziegel in der Höhe")).toHaveValue("22");
    await expect(page.locator("svg.touch-none")).toBeVisible();
  });

  test("a confirmed result stays confirmed through a language change, and needs no recount", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/tool");
    await page.getByRole("button", { name: "Try a sample roof" }).click();
    await expect(page.getByLabel("Tiles high")).toHaveValue("22", { timeout: 20_000 });
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page.getByRole("button", { name: "Confirm result" }).click();
    await expect(page.getByRole("button", { name: "JSON" })).toBeEnabled();

    await page.getByRole("button", { name: "Deutsch" }).click();
    await expect(page.getByRole("button", { name: "Bestätigt" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "JSON" })).toBeEnabled();
  });
});
