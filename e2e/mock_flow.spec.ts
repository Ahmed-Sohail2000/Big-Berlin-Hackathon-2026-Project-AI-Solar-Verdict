import { test, expect } from "@playwright/test";

/**
 * Full homeowner → installer loop against the MOCK_MODE fixture chain.
 *
 * Requires a local dev server started with:
 *   MOCK_MODE=true NEXT_PUBLIC_MOCK_MODE=true pnpm dev
 * and BASE_URL=http://localhost:3000. The spec self-skips against the
 * production deploy (mock geocoding resolves the query to a curated demo
 * location — that behavior only exists when MOCK_MODE is set). "Berlin house"
 * deterministically resolves to the residential demo (84 m², gable roof).
 */
const baseUrl = process.env.BASE_URL ?? "https://verdict-gamma-ten.vercel.app";
const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

test.describe("MOCK_MODE homeowner → installer flow", () => {
  test.skip(!isLocal, "mock flow only runs against a local MOCK_MODE dev server");
  test.describe.configure({ mode: "serial" });

  test("intake → quote → send → installer detail, all on fixture data", async ({ page }) => {
    test.setTimeout(90_000);

    // --- Homeowner landing ---
    await page.goto("/");
    const input = page.getByPlaceholder("Enter address or lat,lng...");
    await input.fill("Berlin house");
    await input.blur();

    // Mock geocode resolves "Berlin house" → the residential demo location
    // (gable roof, 2 segments, 84 m²) and the honest MOCK source pill. The
    // intake auto-detects the building type as Residential.
    await expect(page.getByText(/live roof facts/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("84.0 m²")).toBeVisible();
    await expect(page.getByText(/mock/i).first()).toBeVisible();

    // --- Fill consumption + preferences, submit ---
    // Bill input defaults to "per month" (contract field is monthlyBillEur).
    await page.locator("#bill").fill("120");
    // Residential (auto-detected) → the battery preference row is "Battery?".
    await page.getByRole("radiogroup", { name: "Battery?" }).getByRole("radio", { name: "Yes" }).click();
    await page.getByRole("button", { name: /get my proposal/i }).click();

    // --- Quote page: 3 distinct options ---
    await expect(page).toHaveURL(/\/quote\?/, { timeout: 15_000 });
    await expect(page.getByText("Your three system options.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Best Margin")).toBeVisible();
    await expect(page.getByText(/Best Close Rate/)).toBeVisible();
    await expect(page.getByText("Best LTV")).toBeVisible();

    // --- Send the lead ---
    // The quote page is server-rendered; clicking before React hydrates is a
    // no-op. Retry the click until the component actually reacts.
    const sendButton = page.getByRole("button", { name: /send to a certified solar installer/i });
    await expect(async () => {
      await sendButton.click();
      await expect(
        page.getByText(/HelioSense AI sent|Sending HelioSense AI packet/),
      ).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByText("HelioSense AI sent")).toBeVisible({ timeout: 10_000 });

    // --- Installer marketplace + detail ---
    await page.goto("/installer");
    await expect(page.getByText("Qualified leads")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("AI-prefetched technical brief")).toBeVisible({ timeout: 15_000 });

    // Badge honesty on the installer side too — fixture source must not
    // masquerade as "Live Solar API".
    await expect(page.getByText("Simulated Solar data").first()).toBeVisible({ timeout: 15_000 });

    // BoM composed from the cached market catalog with real source chips.
    await expect(page.getByText("AI-recommended BoM")).toBeVisible();
    await expect(page.getByText(/scraped/).first()).toBeVisible();

    // Per-segment placement agrees with the lead: south face used, north skipped.
    await expect(page.getByText("Per-segment placement")).toBeVisible();
    await expect(page.getByText(/skipped: north-facing/)).toBeVisible();
  });
});
