// lib/sizing/grid-policy.ts
// Grid-connection-type policy — a PURE, DETERMINISTIC post-step applied on
// top of an already-computed SizingResult.
//
// Semantics (additive — absent/on_grid leaves the input untouched, so the
// 5 golden-profile tests and every existing call site are unaffected):
//   - "off_grid": every variant must carry a battery sized >= 1.5x daily
//     consumption, and an island/battery-capable (hybrid) inverter.
//   - "hybrid":   every variant must carry a battery (baseline target) and a
//     battery-backup-capable hybrid inverter is preferred.
//
// No side effects, no async, no API calls, no Math.random()/Date.now().
// The input SizingResult is never mutated — a new object is returned.

import type { GridType, Intake, SizingResult, Variant } from "@/lib/contracts";
import { defaultBatteryKwhTarget } from "@/lib/sizing/roi-optimizer";

// ---------------------------------------------------------------------------
// Constants (mirrors of calculate.ts — that file stays untouched by policy)
// ---------------------------------------------------------------------------

const EUR_PER_KWH_RESIDENTIAL = 0.32;
const FEED_IN_EUR_PER_KWH = 0.08;
const SOLAR_DAYTIME_FRACTION = 0.3;

/** Off-grid battery must cover at least this multiple of daily consumption. */
export const OFF_GRID_BATTERY_DAILY_FACTOR = 1.5;

/** € per added kWh of battery capacity when the policy has to upsize/add one
 *  (matches the closeRate €/kWh ladder in calculate.ts). */
const EUR_PER_KWH_BATTERY_ADD = 700;

/**
 * Hybrid (battery-backup-capable) inverters on the 2026 German residential
 * market. Mirrors the `hybridCapable: true` entries in
 * data/fixtures/german_market_catalog.json — keep the two lists in sync.
 * Sorted by kW ascending; nearest-kW pick with first-entry tie-break keeps
 * brand selection deterministic.
 */
const HYBRID_CAPABLE_INVERTERS: ReadonlyArray<{ brand: string; model: string; kw: number }> = [
  { brand: "Huawei", model: "SUN2000-5KTL-L1", kw: 5 },
  { brand: "Fronius", model: "Primo GEN24 6.0 Plus", kw: 6 },
  { brand: "SMA", model: "Sunny Tripower 8.0 Smart Energy", kw: 8 },
  { brand: "Fronius", model: "Symo GEN24 10.0 Plus", kw: 10 },
  { brand: "Huawei", model: "SUN2000-10KTL-M1", kw: 10 },
];

/** Fallback battery model used when a variant has no battery at all. */
const FALLBACK_BATTERY = { brand: "BYD", model: "Battery-Box Premium HVS" };

const round0 = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Contract default: an absent gridType means a normal grid-tied home. */
export function resolveGridType(intake: Pick<Intake, "gridType">): GridType {
  return intake.gridType ?? "on_grid";
}

function nearestHybridInverter(kw: number): { brand: string; model: string } {
  let best = HYBRID_CAPABLE_INVERTERS[0];
  let bestDist = Infinity;
  for (const inv of HYBRID_CAPABLE_INVERTERS) {
    const dist = Math.abs(inv.kw - kw);
    if (dist < bestDist) {
      bestDist = dist;
      best = inv;
    }
  }
  return { brand: best.brand, model: best.model };
}

/** Mirror of calcSelfConsumedKwh in calculate.ts. */
function calcSelfConsumedKwh(
  annualKwh: number,
  annualYieldKwh: number,
  batteryKwh: number,
  dailyKwh: number,
): number {
  const daytimeShare = SOLAR_DAYTIME_FRACTION * annualKwh;
  const batteryShareDaily = Math.min(batteryKwh, dailyKwh * (1 - SOLAR_DAYTIME_FRACTION));
  const batteryShareAnnual = batteryShareDaily * 365;
  const desired = daytimeShare + batteryShareAnnual;
  return Math.min(desired, annualYieldKwh, annualKwh);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Apply the grid-type policy to a finished SizingResult.
 *
 * Returns the input UNCHANGED (same reference) for on_grid / absent gridType,
 * which is what keeps every pre-existing test and call site byte-identical.
 */
export function applyGridTypePolicy<T extends SizingResult>(
  sizing: T,
  intake: Intake,
  eurPerKwhOverride?: number,
): T {
  const gridType = resolveGridType(intake);
  if (gridType === "on_grid") return sizing;

  const eurPerKwh = eurPerKwhOverride ?? EUR_PER_KWH_RESIDENTIAL;
  const dailyKwh = sizing.dailyKwh;

  const minBatteryKwh =
    gridType === "off_grid"
      ? round1(dailyKwh * OFF_GRID_BATTERY_DAILY_FACTOR)
      : round1(Math.max(1, defaultBatteryKwhTarget(dailyKwh)));

  const variants = sizing.variants.map((v): Variant => {
    const existingKwh = v.bom.battery?.kwh ?? 0;
    const targetKwh = round1(Math.max(existingKwh, minBatteryKwh));
    const deltaKwh = Math.max(0, targetKwh - existingKwh);

    // Generic sizer models embed capacity ("Battery 7kWh") — keep the label
    // honest when the policy upsizes the pack.
    const existingModel = v.bom.battery?.model ?? FALLBACK_BATTERY.model;
    const battery = {
      brand: v.bom.battery?.brand ?? FALLBACK_BATTERY.brand,
      model:
        deltaKwh > 0
          ? existingModel.replace(/\d+(?:\.\d+)?\s*kWh/i, `${targetKwh}kWh`)
          : existingModel,
      kwh: targetKwh,
    };

    // Off-grid and hybrid both need a battery-capable inverter.
    const hybridPick = nearestHybridInverter(v.bom.inverter.kw);
    const inverter = { ...v.bom.inverter, brand: hybridPick.brand, model: hybridPick.model };

    const totalEur = round0(v.bom.totalEur + deltaKwh * EUR_PER_KWH_BATTERY_ADD);

    const selfConsumed = calcSelfConsumedKwh(
      sizing.annualKwh,
      sizing.annualYieldKwh,
      battery.kwh,
      dailyKwh,
    );
    const fedIn = Math.max(0, sizing.annualYieldKwh - selfConsumed);
    const annualSavings = selfConsumed * eurPerKwh + fedIn * FEED_IN_EUR_PER_KWH;

    return {
      ...v,
      bom: { ...v.bom, battery, inverter, totalEur },
      monthlySavingsEur: round0(annualSavings / 12),
      paybackYears: annualSavings > 0 ? round1(totalEur / annualSavings) : 0,
    };
  }) as [Variant, Variant, Variant];

  const pass = variants.every(
    (v) => (v.bom.battery?.kwh ?? 0) >= minBatteryKwh - 1e-6,
  );

  return {
    ...sizing,
    batteryKwh: round1(Math.max(sizing.batteryKwh, minBatteryKwh)),
    variants,
    rules: [
      ...sizing.rules,
      {
        name: "grid_type_policy",
        pass,
        message:
          gridType === "off_grid"
            ? `off-grid: battery >= ${minBatteryKwh} kWh (1.5x daily ${round1(dailyKwh)} kWh) + hybrid inverter in every variant`
            : `hybrid: battery (>= ${minBatteryKwh} kWh) + battery-backup-capable inverter in every variant`,
      },
    ],
  };
}
