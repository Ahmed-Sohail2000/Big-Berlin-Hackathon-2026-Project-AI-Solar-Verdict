// lib/sizing/compose-from-market.ts
// Runtime market-aware composer.
//
// Reads the cached German market catalog (scraped once via Tavily+Gemini),
// runs the NPV-optimal panel-count picker, and builds 3 SizingResult
// variants — each with a real BoM stitched from real catalog entries and
// real source URLs.
//
// Pure & deterministic. No fetch, no async, no Date.now() in scoring.
// Only the imported catalog JSON's scrapedAt timestamp is read (passed
// straight through into the result).
//
// DOES NOT modify lib/sizing/calculate.ts. Constants below mirror the ones
// there (and in roi-optimizer.ts) so this module is self-contained.

import catalog from "@/data/fixtures/german_market_catalog.json";
import type {
  BoM,
  Intake,
  Preference,
  RoofSegment,
  SizingResult,
  Strategy,
  Variant,
} from "@/lib/contracts";
import {
  defaultBatteryKwhTarget,
  optimizePanelCountForRoi,
} from "@/lib/sizing/roi-optimizer";
import {
  applyCommercialEngineering,
  commercialEurPerKwh,
  isCommercialBuilding,
} from "@/lib/sizing/commercial-policy";

// ---------------------------------------------------------------------------
// Local constants (mirrors of calculate.ts — do NOT modify that file)
// ---------------------------------------------------------------------------

const PANEL_WP = 440;
const PANEL_KW = PANEL_WP / 1000;
const KWH_PER_PANEL_PER_YEAR_DE = 410;
const FEED_IN_EUR_PER_KWH = 0.08;
const EUR_PER_KWH_RESIDENTIAL = 0.32;
const SOLAR_DAYTIME_FRACTION = 0.3;
const SELF_CONSUMPTION_TARGET = 0.8;
const PANEL_FOOTPRINT_M2 = 1.7;
const ROOF_PACKING_FACTOR = 0.7;
const MIN_SEGMENT_AREA_M2 = 10;
const NPV_HORIZON_YEARS = 25;
/** Commercial annual full-load hours per kW of peak demand (daytime load). */
const COMMERCIAL_FULL_LOAD_HOURS = 1900;
/** Commercial demand-coverage headroom when a peak demand is supplied. */
const COMMERCIAL_DEMAND_COVERAGE = 1.25;
/** Installation labour + amortised overhead multiplier on hardware cost. */
const LABOUR_MULTIPLIER = 1.6;
/**
 * Deterministic split of the commercial balance-of-system residual
 * (totalEur − hardware − mounting) across the named BoS line items. These are
 * engineering conventions (share of the catalog-derived residual), NOT
 * invented prices — every euro traces back to the catalog-priced total.
 */
const BOS_SPLIT = {
  dcStringCabling: 0.15,
  acCombinerProtection: 0.12,
  gridConnection: 0.18,
  installationLabour: 0.55,
} as const;

// ---------------------------------------------------------------------------
// Catalog typing
// ---------------------------------------------------------------------------

interface CatalogPanel {
  brand: string;
  model: string;
  wp: number;
  eurEx: number;
  currency: string;
  sourceUrl: string;
  sourceTitle: string;
  /** True for commercial large-format / bifacial C&I modules. */
  commercial?: boolean;
}
interface CatalogInverter {
  brand: string;
  model: string;
  kw: number;
  eurEx: number;
  currency: string;
  sourceUrl: string;
  sourceTitle: string;
  /** True for battery-backup-capable hybrid inverters (GEN24 Plus, Smart Energy, SUN2000). */
  hybridCapable?: boolean;
  /** True for commercial 3-phase string inverters (CORE1/CORE2, 100KTL, Tauro). */
  commercial?: boolean;
}
interface CatalogBattery {
  brand: string;
  model: string;
  kwh: number;
  eurEx: number;
  currency: string;
  sourceUrl: string;
  sourceTitle: string;
}
interface CatalogWallbox {
  brand: string;
  model: string;
  kw: number;
  eurEx: number;
  currency: string;
  sourceUrl: string;
  sourceTitle: string;
}
interface CatalogHeatPump {
  brand: string;
  model: string;
  kw: number;
  eurEx: number;
  currency: string;
  sourceUrl: string;
  sourceTitle: string;
}
interface CatalogMount {
  brand: string;
  model: string;
  eurEx: number;
  currency: string;
  sourceUrl: string;
  sourceTitle: string;
  /** True for commercial flat-roof ballasted mounting (K2 D-Dome, Schletter FixGrid). */
  commercial?: boolean;
}
interface MarketCatalog {
  scrapedAt: string;
  source: string;
  panels: CatalogPanel[];
  inverters: CatalogInverter[];
  batteries: CatalogBattery[];
  wallboxes: CatalogWallbox[];
  heatPumps: CatalogHeatPump[];
  mounts: CatalogMount[];
}

const CATALOG: MarketCatalog = catalog as MarketCatalog;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface VariantSourceUrls {
  panel: string;
  inverter: string;
  battery?: string;
  wallbox?: string;
  heatPump?: string;
  mount?: string;
}

export type SizingResultWithMarket = SizingResult & {
  /** Per-variant source-URL provenance for every BoM line. */
  sourceUrls?: Record<Strategy, VariantSourceUrls>;
  /** Catalog scrape timestamp (passed straight through from the JSON). */
  catalogScrapedAt?: string;
  /** Catalog data source attribution (e.g. "tavily+gemini+fallback"). */
  catalogSource?: string;
};

// ---------------------------------------------------------------------------
// Roof helpers (mirrors calculate.ts)
// ---------------------------------------------------------------------------

type AzimuthBucket = "E" | "SE" | "S" | "SW" | "W" | "N" | "flat";

const AZIMUTH_FACTOR: Record<AzimuthBucket, number> = {
  S: 1.0,
  SE: 0.94,
  SW: 0.94,
  E: 0.84,
  W: 0.84,
  flat: 0.92,
  N: 0.55,
};

function bucketAzimuth(azimuthDegrees: number, pitchDegrees: number): AzimuthBucket {
  if (pitchDegrees < 5) return "flat";
  const a = ((azimuthDegrees % 360) + 360) % 360;
  if (a >= 157.5 && a < 202.5) return "S";
  if (a >= 112.5 && a < 157.5) return "SE";
  if (a >= 202.5 && a < 247.5) return "SW";
  if (a >= 67.5 && a < 112.5) return "E";
  if (a >= 247.5 && a < 292.5) return "W";
  return "N";
}

function pitchFactor(pitch: number): number {
  if (pitch < 5) return 0.92;
  if (pitch > 50) return 0.85;
  if (pitch >= 20 && pitch <= 40) return 1.0;
  return 0.95;
}

function clampSunshineFactor(annualSunshineHours: number): number {
  const raw = annualSunshineHours / 1000;
  if (!Number.isFinite(raw)) return 1.0;
  return Math.min(1.15, Math.max(0.6, raw));
}

function isUsableSegment(s: RoofSegment): boolean {
  if (s.areaMeters2 <= MIN_SEGMENT_AREA_M2) return false;
  if (s.pitchDegrees < 5) return true;
  const a = ((s.azimuthDegrees % 360) + 360) % 360;
  return a >= 90 && a <= 270;
}

function segmentCapacity(s: RoofSegment): number {
  return Math.floor((s.areaMeters2 / PANEL_FOOTPRINT_M2) * ROOF_PACKING_FACTOR);
}

function calcUsableRoofArea(segments: RoofSegment[]): number {
  return segments.reduce((sum, s) => sum + Math.max(0, s.areaMeters2), 0);
}

function calcPanelFitMax(segments: RoofSegment[]): number {
  return segments.filter(isUsableSegment).reduce((sum, s) => sum + segmentCapacity(s), 0);
}

interface UsableRow {
  index: number;
  capacity: number;
  bucket: AzimuthBucket;
  pitch: number;
  perPanelYield: number;
}

function buildUsableRows(segments: RoofSegment[]): UsableRow[] {
  const rows: UsableRow[] = [];
  segments.forEach((s, i) => {
    if (!isUsableSegment(s)) return;
    const bucket = bucketAzimuth(s.azimuthDegrees, s.pitchDegrees);
    const sunshineFactor = clampSunshineFactor(s.annualSunshineHours);
    const perPanelYield =
      KWH_PER_PANEL_PER_YEAR_DE *
      AZIMUTH_FACTOR[bucket] *
      pitchFactor(s.pitchDegrees) *
      sunshineFactor;
    rows.push({
      index: i,
      capacity: segmentCapacity(s),
      bucket,
      pitch: s.pitchDegrees,
      perPanelYield,
    });
  });
  rows.sort((a, b) => {
    if (b.perPanelYield !== a.perPanelYield) return b.perPanelYield - a.perPanelYield;
    return a.index - b.index;
  });
  return rows;
}

function annualYieldForPanelCount(rows: UsableRow[], panelCount: number): number {
  let remaining = Math.max(0, Math.floor(panelCount));
  let total = 0;
  for (const row of rows) {
    if (remaining <= 0) break;
    const take = Math.min(row.capacity, remaining);
    total += take * row.perPanelYield;
    remaining -= take;
  }
  return total;
}

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
// Numeric helpers
// ---------------------------------------------------------------------------

const round0 = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function nearestByKey<T>(items: T[], targetKey: number, getKey: (t: T) => number, idxOffset = 0): T {
  // Pick the item whose key is closest to target. Stable: ties broken by
  // (offset+index) so different idxOffset values rotate selections.
  let bestI = 0;
  let bestDist = Infinity;
  for (let i = 0; i < items.length; i += 1) {
    const dist = Math.abs(getKey(items[i]) - targetKey);
    if (dist < bestDist) {
      bestDist = dist;
      bestI = i;
    }
  }
  // Apply rotation: if multiple items tie within a small epsilon of best,
  // rotate by idxOffset to give variants visible diversity.
  const tied: number[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const dist = Math.abs(getKey(items[i]) - targetKey);
    if (Math.abs(dist - bestDist) < 1e-6) tied.push(i);
  }
  if (tied.length > 1) {
    return items[tied[idxOffset % tied.length]];
  }
  return items[bestI];
}

function rotatePick<T>(items: T[], offset: number): T {
  if (items.length === 0) {
    throw new Error("compose-from-market: empty catalog list");
  }
  return items[((offset % items.length) + items.length) % items.length];
}

// ---------------------------------------------------------------------------
// Three-state preference resolution
// ---------------------------------------------------------------------------

/**
 * Decide whether a given Strategy variant should include a given component
 * given the homeowner's three-state preference. Rules:
 *   yes   → all 3 variants include
 *   no    → no variants include
 *   idk   → component-specific. For battery: include for margin + closeRate,
 *           exclude for ltv. For heat pump: include for ltv only ("go big").
 *           For wallbox: include for closeRate + ltv, exclude for margin.
 *   undef → same as idk (we never have legacy "yes" values for these).
 */
function includeBatteryFor(strategy: Strategy, pref: Preference | undefined): boolean {
  if (pref === "yes") return true;
  if (pref === "no") return false;
  // idk / undefined → margin & closeRate include, ltv excludes
  return strategy !== "ltv";
}

function includeHeatPumpFor(strategy: Strategy, pref: Preference | undefined): boolean {
  if (pref === "yes") return true;
  if (pref === "no") return false;
  // idk / undefined → only ltv includes
  return strategy === "ltv";
}

function includeWallboxFor(
  strategy: Strategy,
  evPref: Preference | undefined,
  legacyEv: boolean,
): boolean {
  if (evPref === "yes") return true;
  if (evPref === "no") return false;
  if (legacyEv === true && evPref === undefined) return true;
  // idk → closeRate + ltv include, margin excludes
  return strategy !== "margin";
}

// ---------------------------------------------------------------------------
// Variant config (mirrors calculate.ts shape but locally owned)
// ---------------------------------------------------------------------------

interface VariantConfig {
  strategy: Strategy;
  label: Variant["label"];
  /** Multiplier applied to deterministic battery target. */
  batteryFactor: number;
  /** Multiplier on inverter sizing relative to system kWp. */
  inverterFactor: number;
  /** Strategy-stable cosmetic copy used when building Variant fields. */
  marginPct: number;
  winRatePct: number;
  confidence: number;
  objection: string;
}

const VARIANT_CONFIGS: VariantConfig[] = [
  {
    strategy: "margin",
    label: "Best Margin",
    batteryFactor: 0.6,
    inverterFactor: 0.85,
    marginPct: 31,
    winRatePct: 38,
    confidence: 0.72,
    objection:
      "Risk: smaller battery may feel undersized once the EV or heat pump arrives; counter with a battery-expansion roadmap.",
  },
  {
    strategy: "closeRate",
    label: "Best Close Rate",
    batteryFactor: 1.0,
    inverterFactor: 0.95,
    marginPct: 28,
    winRatePct: 52,
    confidence: 0.84,
    objection:
      "Risk: homeowner may flinch at the battery price; counter with cited closed projects in the same kWp band.",
  },
  {
    strategy: "ltv",
    label: "Best LTV",
    batteryFactor: 1.4,
    inverterFactor: 1.05,
    marginPct: 24,
    winRatePct: 33,
    confidence: 0.66,
    objection:
      "Risk: total ticket price triggers sticker shock; counter with the 25-year lifetime savings curve and KfW eligibility.",
  },
];

// ---------------------------------------------------------------------------
// Public composer
// ---------------------------------------------------------------------------

export interface ComposeFromMarketArgs {
  intake: Intake;
  roofSegments: RoofSegment[];
  /** Override electricity price (e.g. live Tavily tariff). Defaults to 0.32 €/kWh. */
  eurPerKwh?: number;
}

export function composeFromMarket(args: ComposeFromMarketArgs): SizingResultWithMarket {
  const { intake, roofSegments } = args;
  // Commercial sites use the DE commercial tariff benchmark (labelled) unless
  // the caller supplies an explicit override; residential keeps 0.32.
  const commercial = isCommercialBuilding(intake.buildingType);
  const eurPerKwh =
    args.eurPerKwh ?? (commercial ? commercialEurPerKwh(intake.country) : EUR_PER_KWH_RESIDENTIAL);

  // Grid connection type. Absent = "on_grid" (German residential default).
  //   off_grid → every variant carries a battery >= 1.5x daily consumption
  //              and a hybrid (island-capable) inverter.
  //   hybrid   → every variant carries a battery; hybrid inverters preferred.
  const gridType = intake.gridType ?? "on_grid";

  // -----------------------------------------------------------------------
  // 1. Demand
  // -----------------------------------------------------------------------
  const annualKwhRaw =
    typeof intake.annualKwh === "number" && intake.annualKwh > 0
      ? intake.annualKwh
      : Math.max(0, (intake.monthlyBillEur * 12) / eurPerKwh);
  const dailyKwh = annualKwhRaw / 365;
  const baselineBatteryKwh = defaultBatteryKwhTarget(dailyKwh);

  // -----------------------------------------------------------------------
  // 2. Catalog economics
  // -----------------------------------------------------------------------
  if (CATALOG.panels.length === 0) {
    throw new Error("compose-from-market: catalog has no panels");
  }
  // Panels sorted by €/Wp ascending (deterministic: brand+model tie-break).
  // Tiers map onto strategies: margin → cheapest €/Wp, closeRate → market
  // mid (~0.35 €/Wp), ltv → premium tier (~0.45+ €/Wp, e.g. Aiko/Meyer Burger).
  // Commercial proposals draw from commercial large-format / bifacial modules
  // only (falling back to the full pool if the catalog carries none).
  const commercialPanels = CATALOG.panels.filter((p) => p.commercial === true);
  const panelPool =
    commercial && commercialPanels.length > 0 ? commercialPanels : CATALOG.panels;
  const panelsByEurPerWp = [...panelPool].sort((a, b) => {
    const d = a.eurEx / a.wp - b.eurEx / b.wp;
    if (d !== 0) return d;
    return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
  });
  const cheapestPanel = panelsByEurPerWp[0];
  const PANEL_TIER_BY_STRATEGY: Record<Strategy, CatalogPanel> = {
    margin: cheapestPanel,
    closeRate: panelsByEurPerWp[Math.floor((panelsByEurPerWp.length - 1) / 2)],
    ltv: panelsByEurPerWp[panelsByEurPerWp.length - 1],
  };
  // Panels are ~25% of installed price in DE — multiply by 4 for inverter +
  // labour + BOS amortisation. Keeps sizing comparable with calculate.ts's
  // €/kWp ladder (≈ 1700–2000 €/kWp).
  const eurPerWattInstalled = (cheapestPanel.eurEx / cheapestPanel.wp) * 4;
  const batteryEurPerKwh = median(
    CATALOG.batteries.map((b) => b.eurEx / b.kwh).filter((x) => Number.isFinite(x) && x > 0),
  );

  // -----------------------------------------------------------------------
  // 3. Roof + ROI-optimal panel count
  // -----------------------------------------------------------------------
  const usableRoofAreaM2 = calcUsableRoofArea(roofSegments);
  const panelFitMax = calcPanelFitMax(roofSegments);

  // If no usable roof, fall back to a 1-panel placeholder (the API caller
  // already rejects this case upstream — we just stay defensive).
  const fitMaxSafe = Math.max(1, panelFitMax);

  // Demand-coverage cap. Without this, the NPV optimizer keeps adding
  // panels until roof fit max because German feed-in tariff (€0.08/kWh)
  // still produces marginally positive 25-yr NPV per panel — which sells
  // homeowners a 24 kWp commercial-scale system on a typical residential
  // roof. We cap the optimizer's search at 125 % of *future* demand
  // (current consumption + heat pump + EV inflation per intake prefs)
  // so the recommendation tracks payback speed, not absolute NPV.
  // "yes" = full inflation, "idk" = half, "no" = none.
  const futureDemandKwh =
    annualKwhRaw +
    (intake.wantsHeatPump === "yes"
      ? 3500
      : intake.wantsHeatPump === "idk"
        ? 1500
        : 0) +
    (intake.evPref === "yes" || intake.ev
      ? 2500
      : intake.evPref === "idk"
        ? 1200
        : 0);
  const DEMAND_COVERAGE_CAP = 1.25;
  const demandPanelCap = Math.ceil(
    (futureDemandKwh * DEMAND_COVERAGE_CAP) / KWH_PER_PANEL_PER_YEAR_DE,
  );
  // Commercial rooftops are sized to generation potential: fill the usable roof
  // (or a peak-demand-implied cap) since daytime self-consumption + export make
  // it economic. Residential uses the NPV-optimal demand-coverage cap.
  const commercialPanelCap =
    typeof intake.peakDemandKw === "number" && intake.peakDemandKw > 0
      ? Math.ceil(
          (intake.peakDemandKw * COMMERCIAL_FULL_LOAD_HOURS * COMMERCIAL_DEMAND_COVERAGE) /
            KWH_PER_PANEL_PER_YEAR_DE,
        )
      : fitMaxSafe;
  // Final cap = min(physical roof fit, demand-coverage). Always ≥ 1.
  const roiFitMax = commercial
    ? Math.max(1, Math.min(fitMaxSafe, commercialPanelCap))
    : Math.max(1, Math.min(fitMaxSafe, demandPanelCap));

  const roi = optimizePanelCountForRoi({
    panelFitMax: roiFitMax,
    segments: roofSegments,
    annualKwh: annualKwhRaw,
    dailyKwh,
    batteryKwh: baselineBatteryKwh,
    eurPerKwh,
    eurPerWattInstalled,
    batteryEurPerKwh: Number.isFinite(batteryEurPerKwh) ? batteryEurPerKwh : 600,
  });

  // Commercial fills to the cap (generation-led); residential takes the
  // NPV-optimal count from the optimiser.
  const panelCount = commercial
    ? roiFitMax
    : Math.min(roiFitMax, Math.max(1, roi.panelCount));
  const systemKwpRaw = panelCount * PANEL_KW;
  const systemKwp = round1(systemKwpRaw);

  const usableRows = buildUsableRows(roofSegments);
  const annualYieldKwh = round0(annualYieldForPanelCount(usableRows, panelCount));

  // -----------------------------------------------------------------------
  // 4. Build per-variant BoMs from the catalog
  // -----------------------------------------------------------------------
  const variants: Variant[] = [];
  const sourceUrls: Partial<Record<Strategy, VariantSourceUrls>> = {};

  // Off-grid battery floor: 1.5x daily consumption.
  const offGridMinBatteryKwh = round1(dailyKwh * 1.5);

  // Hybrid/off-grid systems need a battery-backup-capable inverter. Falls
  // back to the full pool if the catalog carries no hybrid units (defensive).
  // Commercial (grid-tied) systems use commercial 3-phase string inverters.
  const hybridInverters = CATALOG.inverters.filter((i) => i.hybridCapable === true);
  const commercialInverters = CATALOG.inverters.filter((i) => i.commercial === true);
  const inverterPool =
    gridType !== "on_grid" && hybridInverters.length > 0
      ? hybridInverters
      : commercial && commercialInverters.length > 0
        ? commercialInverters
        : CATALOG.inverters;

  // Commercial mounting = flat-roof ballasted (K2 D-Dome / Schletter FixGrid).
  const commercialMounts = CATALOG.mounts.filter((m) => m.commercial === true);
  const mountPool =
    commercial && commercialMounts.length > 0 ? commercialMounts : CATALOG.mounts;

  VARIANT_CONFIGS.forEach((cfg, vIdx) => {
    // Off-grid / hybrid connections always include a battery — a homeowner
    // preference of "no" cannot produce a working off-grid system.
    const includeBattery =
      gridType !== "on_grid" || includeBatteryFor(cfg.strategy, intake.wantsBattery);
    const includeHp = includeHeatPumpFor(cfg.strategy, intake.wantsHeatPump);
    const includeWb = includeWallboxFor(cfg.strategy, intake.evPref, intake.ev);

    // Panel: strategy-tiered pick from the €/Wp-sorted catalog.
    const panelChoice = PANEL_TIER_BY_STRATEGY[cfg.strategy];

    // Inverter: nearest match to (systemKwp × inverterFactor), rotated by vIdx.
    const inverterTargetKw = systemKwpRaw * cfg.inverterFactor;
    const inverterChoice = nearestByKey(
      inverterPool,
      inverterTargetKw,
      (i) => i.kw,
      vIdx,
    );

    // Battery: nearest match to baseline × batteryFactor, rotated. Off-grid
    // restricts the pool to units that meet the 1.5x-daily floor (falling
    // back to the largest unit if nothing in the catalog is big enough).
    const batteryTargetKwh =
      gridType === "off_grid"
        ? Math.max(offGridMinBatteryKwh, baselineBatteryKwh * cfg.batteryFactor)
        : gridType === "hybrid"
          ? Math.max(1, baselineBatteryKwh * cfg.batteryFactor)
          : Math.max(0, baselineBatteryKwh * cfg.batteryFactor);
    let batteryPool = CATALOG.batteries;
    if (gridType === "off_grid" && CATALOG.batteries.length > 0) {
      const bigEnough = CATALOG.batteries.filter((b) => b.kwh >= offGridMinBatteryKwh);
      batteryPool =
        bigEnough.length > 0
          ? bigEnough
          : [CATALOG.batteries.reduce((a, b) => (b.kwh > a.kwh ? b : a))];
    }
    let batteryChoice = includeBattery && batteryPool.length > 0
      ? nearestByKey(batteryPool, batteryTargetKwh, (b) => b.kwh, vIdx)
      : undefined;
    // Off-grid floor: if no single unit is big enough, stack modules of the
    // chosen unit (BYD Battery-Box / Sungrow SBR are modular towers) until
    // the 1.5x-daily requirement is met. Deterministic: pure arithmetic.
    if (gridType === "off_grid" && batteryChoice && batteryChoice.kwh < offGridMinBatteryKwh) {
      const units = Math.ceil(offGridMinBatteryKwh / batteryChoice.kwh);
      batteryChoice = {
        ...batteryChoice,
        model: `${batteryChoice.model} x${units}`,
        kwh: round1(batteryChoice.kwh * units),
        eurEx: batteryChoice.eurEx * units,
      };
    }

    // Wallbox: 11kW typical; rotate brand.
    const wallboxChoice = includeWb && CATALOG.wallboxes.length > 0
      ? rotatePick(CATALOG.wallboxes, vIdx)
      : undefined;

    // Heat pump: ~10kW typical; rotate brand.
    const heatPumpChoice = includeHp && CATALOG.heatPumps.length > 0
      ? nearestByKey(CATALOG.heatPumps, 10, (h) => h.kw, vIdx)
      : undefined;

    // Mount: rotate brand. One mount unit per panel.
    const mountChoice = mountPool.length > 0
      ? rotatePick(mountPool, vIdx)
      : undefined;

    // ---- BoM ----
    const inverterKw = round1(systemKwpRaw * cfg.inverterFactor);
    const batteryKwhActual = batteryChoice ? batteryChoice.kwh : 0;

    const bom: BoM = {
      panels: {
        brand: panelChoice.brand,
        model: panelChoice.model,
        count: panelCount,
        wp: panelChoice.wp,
      },
      inverter: {
        brand: inverterChoice.brand,
        model: inverterChoice.model,
        kw: inverterKw,
      },
      totalEur: 0, // filled below
    };
    if (batteryChoice) {
      bom.battery = {
        brand: batteryChoice.brand,
        model: batteryChoice.model,
        kwh: batteryChoice.kwh,
      };
    }
    if (wallboxChoice) {
      bom.wallbox = {
        brand: wallboxChoice.brand,
        model: wallboxChoice.model,
        kw: wallboxChoice.kw,
      };
    }
    if (heatPumpChoice) {
      bom.heatPump = {
        brand: heatPumpChoice.brand,
        model: heatPumpChoice.model,
        kw: heatPumpChoice.kw,
      };
    }

    // ---- Real catalog-priced total ----
    // Panels: count × eurEx (we treat eurEx as per-panel price).
    // Inverter: 1 × eurEx.
    // Battery: 1 × eurEx (sized unit).
    // Wallbox / HP: 1 × eurEx.
    // Mount: count × eurEx (per-panel mounting hardware).
    // Add an installation labour multiplier so total looks realistic.
    const hardwareEur =
      panelChoice.eurEx * panelCount +
      inverterChoice.eurEx +
      (batteryChoice ? batteryChoice.eurEx : 0) +
      (wallboxChoice ? wallboxChoice.eurEx : 0) +
      (heatPumpChoice ? heatPumpChoice.eurEx : 0);
    const mountingEur = mountChoice ? mountChoice.eurEx * panelCount : 0;
    bom.totalEur = round0((hardwareEur + mountingEur) * LABOUR_MULTIPLIER);

    // ---- Commercial balance-of-system line items ----
    // balance = totalEur − hardware, split across named BoS lines by
    // deterministic engineering-convention shares (catalog-derived residual —
    // never an LLM-invented price). Mounting is a real catalog line.
    if (commercial) {
      const hardwareRounded = round0(hardwareEur);
      const balanceEur = Math.max(0, bom.totalEur - hardwareRounded);
      const mountLine = Math.min(round0(mountingEur), balanceEur);
      const residual = Math.max(0, balanceEur - mountLine);
      const dc = round0(residual * BOS_SPLIT.dcStringCabling);
      const acFull = round0(residual * BOS_SPLIT.acCombinerProtection);
      const grid = round0(residual * BOS_SPLIT.gridConnection);
      // Labour absorbs the rounding remainder so the lines sum EXACTLY to balance.
      const labour = balanceEur - mountLine - dc - acFull - grid;
      const approxStrings = Math.max(1, Math.ceil(panelCount / 19));
      // UAE / DEWA Shams Dubai mandates a compliant DC isolator per array
      // (IEC 60947-3, DC-PV2, IP66, 50°C+). Carve its cost out of the generic
      // AC/DC protection line so the BoS still sums exactly to the balance.
      const isAE = (intake.country ?? "").toUpperCase() === "AE";
      const dcIsolatorEur = isAE ? Math.min(round0(120 + approxStrings * 45), acFull) : 0;
      const ac = acFull - dcIsolatorEur;
      bom.balanceOfSystem = [
        {
          item: "Flat-roof mounting system",
          detail: mountChoice
            ? `${mountChoice.brand} ${mountChoice.model} x${panelCount}`
            : "ballasted flat-roof mounting",
          eur: mountLine,
        },
        {
          item: "DC string cabling & connectors",
          detail: `${approxStrings} strings, MC4 + solar cable`,
          eur: dc,
        },
        {
          item: "AC combiner + protection",
          detail: "string combiner, DC/AC OCPD, surge protection",
          eur: ac,
        },
        ...(isAE
          ? [
              {
                item: "DC isolator (DEWA-compliant)",
                detail: "IEC 60947-3 · DC-PV2 · IP66 · 50°C+ rated",
                eur: dcIsolatorEur,
              },
            ]
          : []),
        {
          item: "Grid connection",
          detail: isAE ? "DEWA bidirectional meter + interconnection" : "metering + utility interconnection",
          eur: grid,
        },
        {
          item: "Installation labour",
          detail: "mechanical + electrical installation & commissioning",
          eur: labour,
        },
      ];
    }

    // ---- Savings / payback ----
    const selfConsumed = calcSelfConsumedKwh(
      annualKwhRaw,
      annualYieldKwh,
      batteryKwhActual,
      dailyKwh,
    );
    const fedIn = Math.max(0, annualYieldKwh - selfConsumed);
    const annualSavings = selfConsumed * eurPerKwh + fedIn * FEED_IN_EUR_PER_KWH;
    const monthlySavingsEur = round0(annualSavings / 12);
    const paybackYears = annualSavings > 0 ? round1(bom.totalEur / annualSavings) : 0;

    variants.push({
      id: `V-${cfg.strategy}`,
      label: cfg.label,
      strategy: cfg.strategy,
      bom,
      monthlySavingsEur,
      paybackYears,
      marginPct: cfg.marginPct,
      winRatePct: cfg.winRatePct,
      confidence: cfg.confidence,
      citedProjectIds: [],
      objection: cfg.objection,
    });

    const urls: VariantSourceUrls = {
      panel: panelChoice.sourceUrl,
      inverter: inverterChoice.sourceUrl,
    };
    if (batteryChoice) urls.battery = batteryChoice.sourceUrl;
    if (wallboxChoice) urls.wallbox = wallboxChoice.sourceUrl;
    if (heatPumpChoice) urls.heatPump = heatPumpChoice.sourceUrl;
    if (mountChoice) urls.mount = mountChoice.sourceUrl;
    sourceUrls[cfg.strategy] = urls;
  });

  // -----------------------------------------------------------------------
  // 5. Pack into a SizingResult
  // -----------------------------------------------------------------------
  const recommendedBatteryKwh = round1(
    gridType === "off_grid"
      ? Math.max(baselineBatteryKwh, offGridMinBatteryKwh)
      : baselineBatteryKwh,
  );
  const rules: SizingResult["rules"] = [
    {
      name: "roi_optimal",
      pass: roi.npvEur25yr >= 0,
      message: `25-yr NPV = ${round0(roi.npvEur25yr)} € at N=${panelCount}`,
    },
    {
      name: "roof_fit",
      pass: panelCount <= panelFitMax || panelFitMax === 0,
      message: `panels ${panelCount} ≤ roof fit ${panelFitMax}`,
    },
  ];
  if (gridType !== "on_grid") {
    const batteriesOk = variants.every(
      (v) =>
        v.bom.battery !== undefined &&
        (gridType !== "off_grid" || v.bom.battery.kwh >= offGridMinBatteryKwh - 1e-6),
    );
    rules.push({
      name: "grid_type_policy",
      pass: batteriesOk,
      message:
        gridType === "off_grid"
          ? `off-grid: battery >= ${offGridMinBatteryKwh} kWh (1.5x daily ${round1(dailyKwh)} kWh) + hybrid inverter in every variant`
          : "hybrid: battery + battery-backup-capable inverter in every variant",
    });
  }
  const result: SizingResultWithMarket = {
    annualKwh: round0(annualKwhRaw),
    dailyKwh: round1(dailyKwh),
    usableRoofAreaM2: round1(usableRoofAreaM2),
    roofSegments,
    panelCount,
    systemKwp,
    batteryKwh: recommendedBatteryKwh,
    annualYieldKwh,
    rules,
    variants: [variants[0], variants[1], variants[2]] as [Variant, Variant, Variant],
    sourceUrls: sourceUrls as Record<Strategy, VariantSourceUrls>,
    catalogScrapedAt: CATALOG.scrapedAt,
    catalogSource: CATALOG.source,
  };

  // Suppress unused-var warning on horizon constant — kept for documentation.
  void NPV_HORIZON_YEARS;

  // Additive commercial-engineering post-step (pure + deterministic). Returns
  // its input unchanged for a residential/absent buildingType with no flat
  // roofType, so residential composer output is byte-identical.
  return applyCommercialEngineering(result, intake);
}
