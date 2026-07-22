// lib/sizing/__tests__/grid_type.test.ts
// NEW additive test cases for the gridType policy (on_grid | off_grid | hybrid).
// Existing golden-profile and compose-from-market tests are untouched.

import { describe, it, expect } from "vitest";
import { sizeQuote } from "@/lib/sizing/calculate";
import { composeFromMarket } from "@/lib/sizing/compose-from-market";
import { applyGridTypePolicy, OFF_GRID_BATTERY_DAILY_FACTOR } from "@/lib/sizing/grid-policy";
import catalog from "@/data/fixtures/german_market_catalog.json";
import type { Intake, RoofSegment } from "@/lib/contracts";

function makeRoof(areaM2 = 80): RoofSegment[] {
  return [
    {
      pitchDegrees: 30,
      azimuthDegrees: 180,
      areaMeters2: areaM2,
      annualSunshineHours: 1100,
    },
  ];
}

function makeIntake(overrides: Partial<Intake> = {}): Intake {
  return {
    address: "Hubertusbader Strasse 8, 14193 Berlin",
    lat: 52.49,
    lng: 13.27,
    monthlyBillEur: 150,
    annualKwh: 5500,
    ev: false,
    heating: "gas",
    goal: "lower_bill",
    ...overrides,
  };
}

const HYBRID_CAPABLE_MODELS = new Set(
  (catalog as { inverters: Array<{ model: string; hybridCapable?: boolean }> }).inverters
    .filter((i) => i.hybridCapable === true)
    .map((i) => i.model),
);

// ---------------------------------------------------------------------------
// sizeQuote (pure sizer) + grid-type policy
// ---------------------------------------------------------------------------

describe("sizeQuote — gridType policy", () => {
  it("absent gridType behaves exactly like explicit on_grid", () => {
    const base = sizeQuote(makeIntake(), makeRoof());
    const onGrid = sizeQuote(makeIntake({ gridType: "on_grid" }), makeRoof());
    expect(onGrid).toEqual(base);
    // No policy rule appended on the default path.
    expect(base.rules.some((r) => r.name === "grid_type_policy")).toBe(false);
  });

  it("off_grid → every variant has a battery >= 1.5x daily consumption", () => {
    const result = sizeQuote(makeIntake({ gridType: "off_grid" }), makeRoof());
    const minKwh = result.dailyKwh * OFF_GRID_BATTERY_DAILY_FACTOR;
    for (const v of result.variants) {
      expect(v.bom.battery, `variant ${v.strategy} battery`).toBeDefined();
      expect(v.bom.battery!.kwh).toBeGreaterThanOrEqual(minKwh - 0.11);
    }
    const rule = result.rules.find((r) => r.name === "grid_type_policy");
    expect(rule).toBeDefined();
    expect(rule!.pass).toBe(true);
    expect(result.batteryKwh).toBeGreaterThanOrEqual(minKwh - 0.11);
  });

  it("hybrid → every variant has a battery and totals stay positive", () => {
    const result = sizeQuote(makeIntake({ gridType: "hybrid" }), makeRoof());
    for (const v of result.variants) {
      expect(v.bom.battery, `variant ${v.strategy} battery`).toBeDefined();
      expect(v.bom.battery!.kwh).toBeGreaterThan(0);
      expect(v.bom.totalEur).toBeGreaterThan(0);
      expect(v.paybackYears).toBeGreaterThan(0);
    }
    expect(result.rules.find((r) => r.name === "grid_type_policy")?.pass).toBe(true);
  });

  it("is deterministic — same input, same output", () => {
    const a = sizeQuote(makeIntake({ gridType: "off_grid" }), makeRoof());
    const b = sizeQuote(makeIntake({ gridType: "off_grid" }), makeRoof());
    expect(a).toEqual(b);
  });
});

describe("applyGridTypePolicy — purity", () => {
  it("does not mutate its input", () => {
    const base = sizeQuote(makeIntake(), makeRoof());
    const snapshot = JSON.parse(JSON.stringify(base));
    applyGridTypePolicy(base, makeIntake({ gridType: "off_grid" }));
    expect(base).toEqual(snapshot);
  });

  it("returns the identical reference for on_grid", () => {
    const base = sizeQuote(makeIntake(), makeRoof());
    expect(applyGridTypePolicy(base, makeIntake())).toBe(base);
    expect(applyGridTypePolicy(base, makeIntake({ gridType: "on_grid" }))).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// composeFromMarket (catalog path used by the installer detail)
// ---------------------------------------------------------------------------

describe("composeFromMarket — gridType", () => {
  it("off_grid → every variant: catalog battery >= 1.5x daily + hybrid inverter", () => {
    const result = composeFromMarket({
      intake: makeIntake({ gridType: "off_grid" }),
      roofSegments: makeRoof(),
    });
    const minKwh = result.dailyKwh * 1.5;
    for (const v of result.variants) {
      expect(v.bom.battery, `variant ${v.strategy} battery`).toBeDefined();
      expect(v.bom.battery!.kwh).toBeGreaterThanOrEqual(minKwh - 0.11);
      expect(
        HYBRID_CAPABLE_MODELS.has(v.bom.inverter.model),
        `variant ${v.strategy} inverter "${v.bom.inverter.model}" should be hybrid-capable`,
      ).toBe(true);
    }
    expect(result.rules.find((r) => r.name === "grid_type_policy")?.pass).toBe(true);
  });

  it("hybrid → battery in all variants even when wantsBattery='no', hybrid inverter preferred", () => {
    const result = composeFromMarket({
      intake: makeIntake({ gridType: "hybrid", wantsBattery: "no" }),
      roofSegments: makeRoof(),
    });
    for (const v of result.variants) {
      expect(v.bom.battery, `variant ${v.strategy} battery`).toBeDefined();
      expect(
        HYBRID_CAPABLE_MODELS.has(v.bom.inverter.model),
        `variant ${v.strategy} inverter "${v.bom.inverter.model}" should be hybrid-capable`,
      ).toBe(true);
    }
  });

  it("absent gridType keeps legacy behavior (wantsBattery='no' → no batteries)", () => {
    const result = composeFromMarket({
      intake: makeIntake({ wantsBattery: "no" }),
      roofSegments: makeRoof(),
    });
    for (const v of result.variants) {
      expect(v.bom.battery).toBeUndefined();
    }
    expect(result.rules.some((r) => r.name === "grid_type_policy")).toBe(false);
  });

  it("is deterministic — same input, same output", () => {
    const args = {
      intake: makeIntake({ gridType: "hybrid" as const }),
      roofSegments: makeRoof(),
    };
    expect(composeFromMarket(args)).toEqual(composeFromMarket(args));
  });
});
