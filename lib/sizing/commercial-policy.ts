// lib/sizing/commercial-policy.ts
// Commercial solar-engineering policy — a PURE, DETERMINISTIC post-step applied
// on top of an already-computed SizingResult, mirroring grid-policy.ts.
//
// The product pivoted from German residential to B2B commercial (offices,
// retail, warehouses, industrial, agricultural) sold internationally, but the
// grounding data is still 1,277 German residential Reonic projects. So we do
// NOT pretend residential KNN matches commercial roofs — commercial sizing is
// driven by the deterministic solar-engineering rules below (the parameters a
// 10-year solar design engineer produces by hand), never by an LLM.
//
// Semantics (additive — a residential/absent buildingType with no flat roofType
// leaves the input UNCHANGED by reference, so the 5 golden profiles and every
// legacy call site stay byte-identical):
//   - commercial buildingType  -> engineering + hard-rule audit populated.
//   - roofType === "flat"       -> engineering (incl. GCR/row-spacing) populated
//                                  even for a residential flat roof.
//
// No side effects, no async, no API calls, no Math.random()/Date.now().
// The input SizingResult is never mutated — a new object is returned.

import type { BuildingType, Intake, SizingResult } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Commercial hardware reference constants (a representative 2026 commercial
// module + 3-phase string inverter, used only for deterministic string sizing)
// ---------------------------------------------------------------------------

/** Representative commercial bifacial module (Trina Vertex 585 W class).
 *  Open-circuit voltage at STC (V). */
const MODULE_VOC_STC = 52.0;
/** Module max-power-point voltage at STC (V). */
const MODULE_VMP_STC = 43.6;
/** Voc temperature coefficient (fraction / degC). Negative — Voc rises as it
 *  gets colder, which is the worst case for the inverter's max DC voltage. */
const BETA_VOC_PER_C = -0.0025;
/** Vmp (approx Pmax) temperature coefficient (fraction / degC). */
const BETA_VMP_PER_C = -0.0029;
/** Module dimension along the tilt slope for landscape ballasted mounting (m).
 *  585 W bifacial approx 2278 x 1134 mm; landscape => 1.134 m rides up the slope. */
const MODULE_SLANT_LENGTH_M = 1.134;

/** Representative commercial 3-phase string inverter (SMA STP CORE1 /
 *  Huawei SUN2000-100KTL) DC input envelope. */
const INVERTER_MAX_DC_VOLTAGE = 1100; // absolute max — cold-Voc must stay below
const INVERTER_MPPT_MAX_VOLTAGE = 1000; // top of the MPPT tracking window
const INVERTER_MPPT_MIN_VOLTAGE = 150; // MPPT start / lower operating voltage

/** Design cell temperatures for string voltage limits (degC). Cold = winter
 *  worst case for Voc; hot = summer worst case for Vmp. German convention. */
const DESIGN_CELL_TEMP_COLD_C = -10;
const DESIGN_CELL_TEMP_HOT_C = 70;

// ---------------------------------------------------------------------------
// Site / layout constants
// ---------------------------------------------------------------------------

/** Winter-solstice solar declination magnitude (deg). */
const WINTER_DECLINATION_DEG = 23.45;

/** Commercial DC/AC oversizing ratio (1.1–1.25 typical). Inverter AC kW is
 *  back-derived as systemKwp / DC_AC_RATIO. */
const DC_AC_RATIO = 1.2;

/** Assumed commercial performance ratio (0.80–0.85 typical). */
const PERFORMANCE_RATIO = 0.82;

/** German commercial electricity tariff benchmark (EUR/kWh, ex-VAT). Lower than
 *  the ~0.32 residential rate. Used ONLY when a commercial site has no better
 *  signal, and always labelled as a DE benchmark. */
export const EUR_PER_KWH_COMMERCIAL_DE = 0.22;

const round0 = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const deg2rad = (d: number): number => (d * Math.PI) / 180;

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** A building is "commercial" for sizing purposes when buildingType is present
 *  and not "residential". Absent => residential (frozen-contract default). */
export function isCommercialBuilding(buildingType: BuildingType | undefined): boolean {
  return buildingType !== undefined && buildingType !== "residential";
}

/** Commercial EUR/kWh for the given country. We can only honestly ground the DE
 *  benchmark, so every country falls back to the DE commercial rate (the caller
 *  is responsible for LABELLING it as such). Additive & deterministic. */
export function commercialEurPerKwh(country?: string): number {
  // Country is accepted for future per-market benchmarks but intentionally not
  // used yet — we only ground the DE commercial rate and label it as such.
  void country;
  return EUR_PER_KWH_COMMERCIAL_DE;
}

/** True when the engineering post-step applies at all. */
export function commercialEngineeringApplies(intake: Intake): boolean {
  return isCommercialBuilding(intake.buildingType) || intake.roofType === "flat";
}

// ---------------------------------------------------------------------------
// Engineering computation (pure)
// ---------------------------------------------------------------------------

export interface CommercialEngineering {
  tiltDegrees: number;
  groundCoverageRatio?: number;
  rowSpacingMeters?: number;
  dcAcRatio: number;
  specificYieldKwhPerKwp: number;
  performanceRatio: number;
  modulesPerString: number;
  stringCount: number;
  /** Inverter AC rating implied by the DC/AC ratio (kW). */
  inverterAcKw: number;
  /** Cold-temperature string Voc used for the max-voltage check (V). */
  stringVocCold: number;
  /** True when the layout is a low-tilt ballasted array (GCR/row spacing set). */
  flatLayout: boolean;
}

/** Dominant usable-segment pitch (area-weighted pick of the largest segment). */
function dominantPitch(sizing: SizingResult): number {
  let best = sizing.roofSegments[0];
  for (const s of sizing.roofSegments) {
    if (!best || s.areaMeters2 > best.areaMeters2) best = s;
  }
  return best?.pitchDegrees ?? 30;
}

/**
 * Compute the deterministic commercial-engineering parameters.
 *
 * TILT
 *   Flat/ballasted commercial arrays use a shallow tilt (10–15 deg) to cut wind
 *   load, ballast mass, and self-shading; we scale it with latitude and clamp
 *   to [10,15]. A pitched commercial roof uses its own segment pitch.
 *
 * ROW SPACING / GROUND-COVERAGE RATIO (flat layouts only)
 *   We size inter-row spacing so a front row does not shade the row behind it
 *   at the production-weighted winter worst case (solar-noon on the winter
 *   solstice — strict 9-15 h avoidance is impractical at DE latitudes and would
 *   waste >40% of the roof, so we design to noon and accept minor early/late
 *   shading, which is standard commercial practice):
 *       beta  = 90 - |lat| - 23.45            (winter-solstice noon elevation)
 *       rise = L*sin(tilt)                     (top-of-module height above roof)
 *       base = L*cos(tilt)                     (module footprint depth)
 *       gap  = rise / tan(beta)                (shadow cast behind the module)
 *       pitch = base + gap                     (row-to-row centre distance)
 *       GCR  = L / pitch                       (collector width / row pitch)
 *   with L = module slant length (1.134 m landscape).
 *
 * SPECIFIC YIELD
 *   specificYield = POA_irradiation * PR, where the plane-of-array irradiation
 *   is a latitude-scaled DE benchmark and PR = 0.82. Clamped to a DE band.
 *
 * STRING SIZING
 *   Voc_cold = Voc_stc * (1 + betaVoc*(Tmin - 25))     (cold worst case)
 *   maxByVoltage = floor(V_dc,max / Voc_cold)          (never exceed 1100 V)
 *   maxByMppt    = floor(V_mppt,max / Vmp_cold)        (stay in the MPPT window)
 *   minByMppt    = ceil (V_mppt,min / Vmp_hot)         (keep tracking when hot)
 *   modulesPerString is the largest value <= min(maxByVoltage, maxByMppt) that
 *   balances the array; stringCount = ceil(panels / modulesPerString).
 */
export function computeCommercialEngineering(
  sizing: SizingResult,
  intake: Intake,
): CommercialEngineering {
  const lat = Math.abs(intake.lat);
  const pitch = dominantPitch(sizing);
  const flatLayout = intake.roofType === "flat" || (intake.roofType !== "pitched" && pitch < 5);

  // --- Tilt ---
  const tiltDegrees = flatLayout
    ? clamp(round0(lat * 0.3), 10, 15)
    : round1(intake.roofType === "pitched" && pitch < 5 ? 15 : pitch);

  // --- Row spacing + GCR (flat/ballasted layouts only) ---
  let groundCoverageRatio: number | undefined;
  let rowSpacingMeters: number | undefined;
  if (flatLayout) {
    const beta = clamp(90 - lat - WINTER_DECLINATION_DEG, 6, 90); // noon winter elevation
    const rise = MODULE_SLANT_LENGTH_M * Math.sin(deg2rad(tiltDegrees));
    const base = MODULE_SLANT_LENGTH_M * Math.cos(deg2rad(tiltDegrees));
    const gap = rise / Math.tan(deg2rad(beta));
    const pitchM = base + gap;
    rowSpacingMeters = round2(pitchM);
    groundCoverageRatio = round2(clamp(MODULE_SLANT_LENGTH_M / pitchM, 0.25, 0.85));
  }

  // --- Specific yield (latitude-scaled DE benchmark * PR) ---
  const poaIrradiation = clamp(1300 - lat * 2.3, 900, 1400); // kWh/m2/yr, DE benchmark
  const specificYieldKwhPerKwp = clamp(round0(poaIrradiation * PERFORMANCE_RATIO), 800, 1100);

  // --- DC/AC ---
  const inverterAcKw = round1(sizing.systemKwp / DC_AC_RATIO);

  // --- String sizing ---
  const vocCold = MODULE_VOC_STC * (1 + BETA_VOC_PER_C * (DESIGN_CELL_TEMP_COLD_C - 25));
  const vmpCold = MODULE_VMP_STC * (1 + BETA_VMP_PER_C * (DESIGN_CELL_TEMP_COLD_C - 25));
  const vmpHot = MODULE_VMP_STC * (1 + BETA_VMP_PER_C * (DESIGN_CELL_TEMP_HOT_C - 25));
  const maxByVoltage = Math.floor(INVERTER_MAX_DC_VOLTAGE / vocCold);
  const maxByMppt = Math.floor(INVERTER_MPPT_MAX_VOLTAGE / vmpCold);
  const minByMppt = Math.max(1, Math.ceil(INVERTER_MPPT_MIN_VOLTAGE / vmpHot));
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

  return {
    tiltDegrees,
    groundCoverageRatio,
    rowSpacingMeters,
    dcAcRatio: DC_AC_RATIO,
    specificYieldKwhPerKwp,
    performanceRatio: PERFORMANCE_RATIO,
    modulesPerString,
    stringCount,
    inverterAcKw,
    stringVocCold: round1(vocCold),
    flatLayout: Boolean(flatLayout),
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Apply the commercial-engineering policy to a finished SizingResult.
 *
 * Returns the input UNCHANGED (same reference) for a residential/absent
 * buildingType with no flat roofType, which keeps every pre-existing test and
 * call site byte-identical. Otherwise returns a NEW object with `engineering`
 * populated and honest audit entries appended to `rules`.
 */
export function applyCommercialEngineering<T extends SizingResult>(
  sizing: T,
  intake: Intake,
): T {
  if (!commercialEngineeringApplies(intake)) return sizing;

  const eng = computeCommercialEngineering(sizing, intake);

  const engineering: NonNullable<SizingResult["engineering"]> = {
    tiltDegrees: eng.tiltDegrees,
    dcAcRatio: eng.dcAcRatio,
    specificYieldKwhPerKwp: eng.specificYieldKwhPerKwp,
    performanceRatio: eng.performanceRatio,
    modulesPerString: eng.modulesPerString,
    stringCount: eng.stringCount,
  };
  if (eng.groundCoverageRatio !== undefined) engineering.groundCoverageRatio = eng.groundCoverageRatio;
  if (eng.rowSpacingMeters !== undefined) engineering.rowSpacingMeters = eng.rowSpacingMeters;

  const stringVoltageMax = round0(eng.modulesPerString * eng.stringVocCold);
  const buildingLabel = intake.buildingType ?? "residential";

  const rules: SizingResult["rules"] = [
    ...sizing.rules,
    {
      name: "engineering_commercial",
      pass: true,
      message:
        `${buildingLabel}${eng.flatLayout ? " flat/ballasted" : " pitched"}: ` +
        `tilt ${eng.tiltDegrees} deg, DC/AC ${eng.dcAcRatio} (inverter ~${eng.inverterAcKw} kW AC), ` +
        `${eng.stringCount}x ${eng.modulesPerString}-module strings, ` +
        `specific yield ~${eng.specificYieldKwhPerKwp} kWh/kWp @ PR ${eng.performanceRatio} (DE benchmark)` +
        (eng.groundCoverageRatio !== undefined
          ? `, GCR ${eng.groundCoverageRatio} / row pitch ${eng.rowSpacingMeters} m`
          : ""),
    },
    {
      name: "string_voltage_limit",
      pass: stringVoltageMax <= INVERTER_MAX_DC_VOLTAGE,
      message:
        `${eng.modulesPerString} modules x ${eng.stringVocCold} V cold-Voc = ${stringVoltageMax} V ` +
        `(<= ${INVERTER_MAX_DC_VOLTAGE} V inverter max DC)`,
    },
  ];

  if (eng.flatLayout && eng.groundCoverageRatio !== undefined) {
    rules.push({
      name: "inter_row_shading",
      pass: eng.groundCoverageRatio >= 0.25 && eng.groundCoverageRatio <= 0.85,
      message:
        `GCR ${eng.groundCoverageRatio} (row pitch ${eng.rowSpacingMeters} m) sized for ` +
        `winter-solstice noon sun at lat ${round1(Math.abs(intake.lat))} deg (DE benchmark)`,
    });
  }

  return { ...sizing, engineering, rules };
}
