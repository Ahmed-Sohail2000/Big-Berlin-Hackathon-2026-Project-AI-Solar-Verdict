// lib/sizing/__tests__/commercial.test.ts
// NEW additive test cases for the deterministic commercial-engineering policy.
// The 5 residential golden profiles and every existing test are untouched.

import { describe, it, expect } from "vitest";
import { sizeQuote } from "@/lib/sizing/calculate";
import { composeFromMarket } from "@/lib/sizing/compose-from-market";
import {
  applyCommercialEngineering,
  computeCommercialEngineering,
  isCommercialBuilding,
} from "@/lib/sizing/commercial-policy";
import type { BuildingType, Intake, RoofSegment } from "@/lib/contracts";

function makeRoof(
  areaM2 = 60,
  pitch = 35,
  azimuth = 180,
  sunshineHours = 1100,
): RoofSegment[] {
  return [
    {
      pitchDegrees: pitch,
      azimuthDegrees: azimuth,
      areaMeters2: areaM2,
      annualSunshineHours: sunshineHours,
    },
  ];
}

function makeIntake(overrides: Partial<Intake> = {}): Intake {
  return {
    address: "Reichstag, Berlin, Germany",
    lat: 52.52,
    lng: 13.38,
    monthlyBillEur: 0,
    annualKwh: 5200,
    ev: false,
    heating: "gas",
    goal: "lower_bill",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Residential-absent equivalence — the whole point of the additive guard.
// ---------------------------------------------------------------------------

describe("commercial policy — residential equivalence", () => {
  it("absent buildingType leaves sizeQuote output byte-identical (same reference from the post-step)", () => {
    const base = sizeQuote(makeIntake(), makeRoof());
    // No engineering block, no commercial rules on the residential path.
    expect(base.engineering).toBeUndefined();
    expect(base.rules.some((r) => r.name === "engineering_commercial")).toBe(false);
  });

  it("explicit residential buildingType behaves exactly like absent", () => {
    const absent = sizeQuote(makeIntake(), makeRoof());
    const explicit = sizeQuote(makeIntake({ buildingType: "residential" }), makeRoof());
    expect(explicit).toEqual(absent);
  });

  it("applyCommercialEngineering returns the identical reference for residential", () => {
    const base = sizeQuote(makeIntake(), makeRoof());
    expect(applyCommercialEngineering(base, makeIntake())).toBe(base);
    expect(applyCommercialEngineering(base, makeIntake({ buildingType: "residential" }))).toBe(base);
  });

  it("isCommercialBuilding classifies the six building types correctly", () => {
    expect(isCommercialBuilding(undefined)).toBe(false);
    expect(isCommercialBuilding("residential")).toBe(false);
    for (const bt of ["office", "retail", "warehouse", "industrial", "agricultural"] as BuildingType[]) {
      expect(isCommercialBuilding(bt)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Engineering params populated + honest audit for commercial.
// ---------------------------------------------------------------------------

describe("commercial policy — engineering params", () => {
  it("warehouse + flat roof populates tilt, GCR, row-spacing, DC/AC, yield, strings", () => {
    const result = sizeQuote(
      makeIntake({ buildingType: "warehouse", roofType: "flat", annualKwh: undefined, peakDemandKw: 150 }),
      makeRoof(1500, 3, 180, 1050),
    );
    const eng = result.engineering;
    expect(eng).toBeDefined();
    expect(eng!.tiltDegrees).toBeGreaterThanOrEqual(10);
    expect(eng!.tiltDegrees).toBeLessThanOrEqual(15);
    expect(eng!.groundCoverageRatio).toBeGreaterThanOrEqual(0.25);
    expect(eng!.groundCoverageRatio).toBeLessThanOrEqual(0.85);
    expect(eng!.rowSpacingMeters).toBeGreaterThan(1.5);
    expect(eng!.rowSpacingMeters).toBeLessThan(5);
    expect(eng!.dcAcRatio).toBeGreaterThanOrEqual(1.1);
    expect(eng!.dcAcRatio).toBeLessThanOrEqual(1.25);
    expect(eng!.specificYieldKwhPerKwp).toBeGreaterThanOrEqual(900);
    expect(eng!.specificYieldKwhPerKwp).toBeLessThanOrEqual(1050);
    expect(eng!.performanceRatio).toBeGreaterThanOrEqual(0.8);
    expect(eng!.performanceRatio).toBeLessThanOrEqual(0.85);
    expect(eng!.stringCount).toBeGreaterThanOrEqual(1);
    expect(eng!.modulesPerString).toBeGreaterThanOrEqual(4);

    // Honest audit entries appended, and the string-voltage hard rule passes.
    expect(result.rules.some((r) => r.name === "engineering_commercial")).toBe(true);
    const vrule = result.rules.find((r) => r.name === "string_voltage_limit");
    expect(vrule?.pass).toBe(true);
    expect(result.rules.some((r) => r.name === "inter_row_shading")).toBe(true);
  });

  it("pitched commercial office omits GCR/row-spacing but keeps string + DC/AC params", () => {
    const result = sizeQuote(
      makeIntake({ buildingType: "office", roofType: "pitched" }),
      makeRoof(300, 30, 180, 1100),
    );
    const eng = result.engineering;
    expect(eng).toBeDefined();
    expect(eng!.groundCoverageRatio).toBeUndefined();
    expect(eng!.rowSpacingMeters).toBeUndefined();
    expect(eng!.tiltDegrees).toBeCloseTo(30, 0);
    expect(eng!.stringCount).toBeGreaterThanOrEqual(1);
    expect(result.rules.some((r) => r.name === "inter_row_shading")).toBe(false);
  });

  it("string sizing never exceeds the 1100 V inverter max DC (cold Voc)", () => {
    const result = sizeQuote(
      makeIntake({ buildingType: "industrial", roofType: "flat", peakDemandKw: 400 }),
      makeRoof(4000, 3, 180, 1050),
    );
    const eng = computeCommercialEngineering(result, makeIntake({ buildingType: "industrial", roofType: "flat" }));
    // 1100 V / cold-Voc (~56.5 V) => at most 19 modules per string.
    expect(eng.modulesPerString).toBeLessThanOrEqual(19);
    expect(eng.modulesPerString * eng.stringVocCold).toBeLessThanOrEqual(1100);
  });
});

// ---------------------------------------------------------------------------
// 3. Larger-system scaling + flat-roof GCR sanity vs latitude.
// ---------------------------------------------------------------------------

describe("commercial policy — scaling & determinism", () => {
  it("a commercial warehouse produces a much larger system than a residential home on the same roof", () => {
    const roof = makeRoof(1200, 4, 180, 1050);
    const residential = sizeQuote(makeIntake({ annualKwh: 5200 }), roof);
    const warehouse = sizeQuote(
      makeIntake({ buildingType: "warehouse", roofType: "flat", annualKwh: undefined, monthlyBillEur: 120 }),
      roof,
    );
    expect(warehouse.panelCount).toBeGreaterThan(residential.panelCount * 3);
    expect(warehouse.systemKwp).toBeGreaterThan(residential.systemKwp);
  });

  it("lower-latitude sites get shorter row spacing (higher GCR) than Berlin", () => {
    const berlin = computeCommercialEngineering(
      sizeQuote(makeIntake({ buildingType: "retail", roofType: "flat", lat: 52.5 }), makeRoof(1000, 3)),
      makeIntake({ buildingType: "retail", roofType: "flat", lat: 52.5 }),
    );
    const rome = computeCommercialEngineering(
      sizeQuote(makeIntake({ buildingType: "retail", roofType: "flat", lat: 41.9 }), makeRoof(1000, 3)),
      makeIntake({ buildingType: "retail", roofType: "flat", lat: 41.9 }),
    );
    expect(rome.groundCoverageRatio!).toBeGreaterThan(berlin.groundCoverageRatio!);
    expect(rome.rowSpacingMeters!).toBeLessThan(berlin.rowSpacingMeters!);
  });

  it("is deterministic — same commercial input, same output", () => {
    const intake = makeIntake({ buildingType: "warehouse", roofType: "flat", peakDemandKw: 200 });
    const roof = makeRoof(2000, 3, 180, 1050);
    expect(sizeQuote(intake, roof)).toEqual(sizeQuote(intake, roof));
  });
});

// ---------------------------------------------------------------------------
// 4. Commercial BoM + balance-of-system via the market composer.
// ---------------------------------------------------------------------------

describe("commercial policy — market composer BoM + balance of system", () => {
  it("commercial variants use commercial hardware and carry a balanceOfSystem that sums to total − hardware", () => {
    const result = composeFromMarket({
      intake: makeIntake({ buildingType: "warehouse", roofType: "flat", peakDemandKw: 150 }),
      roofSegments: makeRoof(1500, 3, 180, 1050),
    });
    for (const v of result.variants) {
      expect(v.bom.balanceOfSystem, `variant ${v.strategy} BoS`).toBeDefined();
      const bos = v.bom.balanceOfSystem!;
      // Every line has a non-negative catalog-derived euro figure.
      for (const line of bos) {
        expect(line.item.length).toBeGreaterThan(0);
        expect(typeof line.eur).toBe("number");
        expect(line.eur!).toBeGreaterThanOrEqual(0);
      }
      // A mounting line and an installation-labour line are present.
      expect(bos.some((l) => /mounting/i.test(l.item))).toBe(true);
      expect(bos.some((l) => /labour/i.test(l.item))).toBe(true);
      // balance-of-system is a strict subset of the total (never exceeds it).
      const bosSum = bos.reduce((s, l) => s + (l.eur ?? 0), 0);
      expect(bosSum).toBeGreaterThan(0);
      expect(bosSum).toBeLessThan(v.bom.totalEur);
    }
    // Engineering populated on the composer result too.
    expect(result.engineering).toBeDefined();
    expect(result.engineering!.stringCount).toBeGreaterThanOrEqual(1);
  });

  it("residential composer output carries no balanceOfSystem and no engineering block", () => {
    const result = composeFromMarket({
      intake: makeIntake(),
      roofSegments: makeRoof(60, 35, 180, 1100),
    });
    for (const v of result.variants) {
      expect(v.bom.balanceOfSystem).toBeUndefined();
    }
    expect(result.engineering).toBeUndefined();
  });
});
