// lib/sizing/electrical.ts
// Residential string-sizing + DC cable voltage-drop/wire-gauge calculators --
// PURE, DETERMINISTIC, no I/O. Mirrors the temperature-correction pattern of
// commercial-policy.ts computeCommercialEngineering, but with a distinct
// realistic residential single-phase string-inverter hardware reference.
//
// IMPORTANT -- these calculators are intentionally NOT wired into sizeQuote()
// default pipeline or into applyCommercialEngineering(). commercial-policy.ts
// documents that residential/pitched inputs must flow through sizeQuote()
// UNCHANGED BY REFERENCE (see its top-of-file comment), and
// golden_profiles.test.ts byte-compares full SizingResult objects for 5 fixed
// profiles. Auto-populating these fields would silently change that output.
// Callers (e.g. a future UI layer) invoke these functions directly and choose
// whether/how to surface the results -- see the new optional
// residential*/voltageDropPercent/wireGaugeMm2 fields on SizingResult.engineering
// in lib/contracts.ts.
//
// No side effects, no async, no API calls, no Math.random()/Date.now().

import type { Intake, SizingResult } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Residential hardware reference constants (a representative 2026 residential
// monofacial module + single-phase string inverter, distinct from the
// commercial constants in commercial-policy.ts).
// ---------------------------------------------------------------------------

/** Representative residential monofacial module (~440 W class, e.g. a
 *  JinkoSolar Tiger Neo / LONGi Hi-MO 440 W). Open-circuit voltage at STC (V). */
const RES_MODULE_VOC_STC = 41.8;
/** Module max-power-point voltage at STC (V). */
const RES_MODULE_VMP_STC = 34.9;
/** Voc temperature coefficient (fraction / degC). Negative -- Voc rises as it
 *  gets colder, which is the worst case for the inverter max DC voltage. */
const RES_BETA_VOC_PER_C = -0.0026;
/** Vmp (approx Pmax) temperature coefficient (fraction / degC). */
const RES_BETA_VMP_PER_C = -0.0035;

/** Representative single-phase residential string inverter (e.g. SMA Sunny
 *  Boy / Fronius Primo / Huawei SUN2000-TL class) DC input envelope. */
const RES_INVERTER_MAX_DC_VOLTAGE = 600; // absolute max -- cold-Voc must stay below
const RES_INVERTER_MPPT_MAX_VOLTAGE = 550; // top of the MPPT tracking window
const RES_INVERTER_MPPT_MIN_VOLTAGE = 80; // MPPT start / lower operating voltage

/** Design cell temperatures for string voltage limits (degC). Cold = winter
 *  worst case for Voc; hot = summer worst case for Vmp. Same convention as
 *  commercial-policy.ts. */
const DESIGN_CELL_TEMP_COLD_C = -10;
const DESIGN_CELL_TEMP_HOT_C = 70;

// ---------------------------------------------------------------------------
// DC cable voltage-drop constants
// ---------------------------------------------------------------------------

/** Copper resistivity (ohm*mm^2/m) -- standard conventional value used by
 *  NEC/IEC voltage-drop calculators. */
const RHO_COPPER = 0.0175;

/** Conventional target max voltage drop on a DC PV string/home-run cable (%). */
const DEFAULT_MAX_DROP_PERCENT = 2;

/** Standard IEC copper cable cross-section table (mm^2). */
const WIRE_GAUGE_TABLE_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35] as const;

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Residential string sizing
// ---------------------------------------------------------------------------

export interface ResidentialStringSizing {
  modulesPerString: number;
  stringCount: number;
  /** Cold-temperature string Voc used for the max-voltage check (V). */
  stringVocCold: number;
  /** True when modulesPerString keeps cold-Voc within the inverter absolute
   *  max DC voltage AND the MPPT tracking window at both temperature extremes. */
  withinMpptWindow: boolean;
}

/**
 * Compute deterministic residential string sizing for a single-phase string
 * inverter, using the same temperature-correction physics as
 * computeCommercialEngineering (commercial-policy.ts) but with residential
 * hardware reference constants.
 *
 *   Voc_cold = Voc_stc * (1 + betaVoc*(Tcold - 25))   (worst-case max voltage)
 *   Vmp_cold = Vmp_stc * (1 + betaVmp*(Tcold - 25))   (worst-case MPPT ceiling)
 *   Vmp_hot  = Vmp_stc * (1 + betaVmp*(Thot  - 25))   (worst-case MPPT floor)
 *   maxByVoltage = floor(V_dc,max   / Voc_cold)
 *   maxByMppt    = floor(V_mppt,max / Vmp_cold)
 *   minByMppt    = ceil (V_mppt,min / Vmp_hot)
 *   modulesPerString = min(maxByVoltage, maxByMppt), floored at minByMppt.
 *   stringCount = ceil(panelCount / modulesPerString).
 */
export function computeResidentialStringSizing(
  sizing: SizingResult,
  intake: Intake,
): ResidentialStringSizing {
  void intake; // reserved for future latitude/temperature-zone refinement

  const vocCold = RES_MODULE_VOC_STC * (1 + RES_BETA_VOC_PER_C * (DESIGN_CELL_TEMP_COLD_C - 25));
  const vmpCold = RES_MODULE_VMP_STC * (1 + RES_BETA_VMP_PER_C * (DESIGN_CELL_TEMP_COLD_C - 25));
  const vmpHot = RES_MODULE_VMP_STC * (1 + RES_BETA_VMP_PER_C * (DESIGN_CELL_TEMP_HOT_C - 25));

  const maxByVoltage = Math.floor(RES_INVERTER_MAX_DC_VOLTAGE / vocCold);
  const maxByMppt = Math.floor(RES_INVERTER_MPPT_MAX_VOLTAGE / vmpCold);
  const minByMppt = Math.max(1, Math.ceil(RES_INVERTER_MPPT_MIN_VOLTAGE / vmpHot));
  const maxMods = Math.max(minByMppt, Math.min(maxByVoltage, maxByMppt));

  const panels = Math.max(1, sizing.panelCount);
  let stringCount: number;
  let modulesPerString: number;
  if (panels <= maxMods) {
    stringCount = 1;
    modulesPerString = panels;
  } else {
    stringCount = Math.ceil(panels / maxMods);
    modulesPerString = Math.max(minByMppt, Math.round(panels / stringCount));
  }

  const stringVocCold = round1(modulesPerString * vocCold);
  const stringVmpCold = modulesPerString * vmpCold;
  const stringVmpHot = modulesPerString * vmpHot;
  const withinMpptWindow =
    stringVocCold <= RES_INVERTER_MAX_DC_VOLTAGE &&
    stringVmpCold <= RES_INVERTER_MPPT_MAX_VOLTAGE &&
    stringVmpHot >= RES_INVERTER_MPPT_MIN_VOLTAGE &&
    modulesPerString >= minByMppt;

  return {
    modulesPerString,
    stringCount,
    stringVocCold,
    withinMpptWindow,
  };
}

// ---------------------------------------------------------------------------
// DC cable voltage drop + wire-gauge recommendation
// ---------------------------------------------------------------------------

export interface VoltageDropResult {
  dropPercent: number;
  dropVolts: number;
}

/**
 * DC voltage drop over a copper conductor run, using the conventional
 * two-way-length formula (round trip: out + return):
 *
 *   dropPercent = (2 * L * I * RHO_COPPER) / (A * V) * 100
 *
 * where L = one-way cable length (m), I = current (A), A = conductor
 * cross-section (mm^2), V = system voltage (V), RHO_COPPER = 0.0175 ohm*mm^2/m.
 */
export function computeVoltageDrop(input: {
  currentA: number;
  oneWayLengthM: number;
  wireSizeMm2: number;
  systemVoltageV: number;
}): VoltageDropResult {
  const { currentA, oneWayLengthM, wireSizeMm2, systemVoltageV } = input;
  const dropVolts = (2 * oneWayLengthM * currentA * RHO_COPPER) / wireSizeMm2;
  const dropPercent = (dropVolts / systemVoltageV) * 100;

  return {
    dropPercent: round2(dropPercent),
    dropVolts: round2(dropVolts),
  };
}

export interface WireGaugeRecommendation {
  wireSizeMm2: number;
  dropPercent: number;
}

/**
 * Pick the smallest standard IEC copper cross-section from
 * WIRE_GAUGE_TABLE_MM2 that keeps the voltage drop at or below
 * maxDropPercent (default 2%, the conventional NEC/IEC target). Falls back
 * to the largest table entry (best effort) if none satisfy the target,
 * rather than throwing.
 */
export function recommendWireGaugeMm2(input: {
  currentA: number;
  oneWayLengthM: number;
  systemVoltageV: number;
  maxDropPercent?: number;
}): WireGaugeRecommendation {
  const { currentA, oneWayLengthM, systemVoltageV } = input;
  const maxDropPercent = input.maxDropPercent ?? DEFAULT_MAX_DROP_PERCENT;

  for (const wireSizeMm2 of WIRE_GAUGE_TABLE_MM2) {
    const { dropPercent } = computeVoltageDrop({
      currentA,
      oneWayLengthM,
      wireSizeMm2,
      systemVoltageV,
    });
    if (dropPercent <= maxDropPercent) {
      return { wireSizeMm2, dropPercent };
    }
  }

  // No table entry satisfies the target -- fall back to the largest gauge.
  const wireSizeMm2 = WIRE_GAUGE_TABLE_MM2[WIRE_GAUGE_TABLE_MM2.length - 1];
  const { dropPercent } = computeVoltageDrop({
    currentA,
    oneWayLengthM,
    wireSizeMm2,
    systemVoltageV,
  });
  return { wireSizeMm2, dropPercent };
}
