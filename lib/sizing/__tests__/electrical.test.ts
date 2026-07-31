// lib/sizing/__tests__/electrical.test.ts
// NEW additive test cases for the residential string-sizing + DC
// voltage-drop/wire-gauge calculators in lib/sizing/electrical.ts. These
// calculators are NOT wired into sizeQuote()'s default pipeline, so the
// golden profiles and every existing test are untouched.

import { describe, it, expect } from "vitest";
import { sizeQuote } from "@/lib/sizing/calculate";
import {
  computeResidentialStringSizing,
  computeVoltageDrop,
  recommendWireGaugeMm2,
} from "@/lib/sizing/electrical";
import type { Intake, RoofSegment } from "@/lib/contracts";

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
// 1. Residential string sizing
// ---------------------------------------------------------------------------

describe("computeResidentialStringSizing", () => {
  it("a typical residential panel count produces sane modulesPerString/stringCount and stays within the MPPT window", () => {
    const intake = makeIntake();
    const sizing = sizeQuote(intake, makeRoof());
    expect(sizing.panelCount).toBeGreaterThan(0);

    const result = computeResidentialStringSizing(sizing, intake);
    expect(result.modulesPerString).toBeGreaterThanOrEqual(1);
    expect(result.stringCount).toBeGreaterThanOrEqual(1);
    expect(result.modulesPerString * result.stringCount).toBeGreaterThanOrEqual(sizing.panelCount);
    expect(result.stringVocCold).toBeGreaterThan(0);
    expect(result.withinMpptWindow).toBe(true);
  });

  it("a pathologically high panel count still returns a valid multi-string layout", () => {
    const intake = makeIntake();
    const sizing = sizeQuote(intake, makeRoof());
    const hugeSizing = { ...sizing, panelCount: 500 };

    const result = computeResidentialStringSizing(hugeSizing, intake);
    expect(result.stringCount).toBeGreaterThan(1);
    expect(result.modulesPerString).toBeGreaterThanOrEqual(1);
    expect(result.stringVocCold).toBeLessThanOrEqual(600);
  });

  it("is deterministic — same input, same output", () => {
    const intake = makeIntake();
    const sizing = sizeQuote(intake, makeRoof());
    expect(computeResidentialStringSizing(sizing, intake)).toEqual(
      computeResidentialStringSizing(sizing, intake),
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Voltage drop
// ---------------------------------------------------------------------------

describe("computeVoltageDrop", () => {
  it("matches a hand-computed value for known inputs", () => {
    // dropVolts = (2 * L * I * RHO) / A = (2 * 20 * 10 * 0.0175) / 6 = 1.1666...
    // dropPercent = dropVolts / V * 100 = 1.1666.../400 * 100 = 0.2916...
    const result = computeVoltageDrop({
      currentA: 10,
      oneWayLengthM: 20,
      wireSizeMm2: 6,
      systemVoltageV: 400,
    });
    expect(result.dropVolts).toBeCloseTo(1.17, 1);
    expect(result.dropPercent).toBeCloseTo(0.29, 2);
  });

  it("longer runs and higher currents produce a larger drop", () => {
    const base = computeVoltageDrop({
      currentA: 10,
      oneWayLengthM: 10,
      wireSizeMm2: 4,
      systemVoltageV: 400,
    });
    const longer = computeVoltageDrop({
      currentA: 10,
      oneWayLengthM: 30,
      wireSizeMm2: 4,
      systemVoltageV: 400,
    });
    const higherCurrent = computeVoltageDrop({
      currentA: 20,
      oneWayLengthM: 10,
      wireSizeMm2: 4,
      systemVoltageV: 400,
    });
    expect(longer.dropPercent).toBeGreaterThan(base.dropPercent);
    expect(higherCurrent.dropPercent).toBeGreaterThan(base.dropPercent);
  });
});

// ---------------------------------------------------------------------------
// 3. Wire-gauge recommendation
// ---------------------------------------------------------------------------

describe("recommendWireGaugeMm2", () => {
  it("picks a larger gauge as run length increases", () => {
    const short = recommendWireGaugeMm2({
      currentA: 10,
      oneWayLengthM: 5,
      systemVoltageV: 400,
    });
    const long = recommendWireGaugeMm2({
      currentA: 10,
      oneWayLengthM: 80,
      systemVoltageV: 400,
    });
    expect(long.wireSizeMm2).toBeGreaterThanOrEqual(short.wireSizeMm2);
    expect(short.dropPercent).toBeLessThanOrEqual(2);
    expect(long.dropPercent).toBeLessThanOrEqual(2);
  });

  it("picks a larger gauge as current increases", () => {
    const lowCurrent = recommendWireGaugeMm2({
      currentA: 5,
      oneWayLengthM: 20,
      systemVoltageV: 400,
    });
    const highCurrent = recommendWireGaugeMm2({
      currentA: 30,
      oneWayLengthM: 20,
      systemVoltageV: 400,
    });
    expect(highCurrent.wireSizeMm2).toBeGreaterThanOrEqual(lowCurrent.wireSizeMm2);
  });

  it("respects a custom maxDropPercent override", () => {
    const loose = recommendWireGaugeMm2({
      currentA: 10,
      oneWayLengthM: 40,
      systemVoltageV: 400,
      maxDropPercent: 5,
    });
    const strict = recommendWireGaugeMm2({
      currentA: 10,
      oneWayLengthM: 40,
      systemVoltageV: 400,
      maxDropPercent: 0.5,
    });
    expect(strict.wireSizeMm2).toBeGreaterThanOrEqual(loose.wireSizeMm2);
    expect(loose.dropPercent).toBeLessThanOrEqual(5);
  });

  it("falls back to the largest table entry (without throwing) when no gauge satisfies the target", () => {
    const result = recommendWireGaugeMm2({
      currentA: 200,
      oneWayLengthM: 500,
      systemVoltageV: 12,
      maxDropPercent: 0.01,
    });
    expect(result.wireSizeMm2).toBe(35);
    expect(Number.isFinite(result.dropPercent)).toBe(true);
  });
});
