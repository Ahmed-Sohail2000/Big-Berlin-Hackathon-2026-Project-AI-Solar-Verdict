// FROZEN AT SAT 18:00. No changes without integration captain approval.
// Read by every workstream — keep narrow, additive only.

export type Heating = "gas" | "oil" | "district" | "heat_pump" | "electric";
export type Goal = "lower_bill" | "independence";
export type Strategy = "margin" | "closeRate" | "ltv";
/** Three-state homeowner preference. "idk" = "show me both with and without so I can compare". */
export type Preference = "yes" | "no" | "idk";
/** Grid connection type. German residential default is "on_grid" (feed-in via EEG); "hybrid" = grid-tied + battery backup. */
export type GridType = "on_grid" | "off_grid" | "hybrid";
/**
 * Building use class — drives commercial-vs-residential sizing defaults and copy.
 * Additive per the frozen-contract rule; when absent the engine treats the site
 * as "residential" so every legacy call site keeps its exact behaviour.
 */
export type BuildingType =
  | "residential"
  | "office"
  | "retail"
  | "warehouse"
  | "industrial"
  | "agricultural";
/**
 * Roof geometry class. Commercial flat roofs need an assumed tilt + inter-row
 * spacing (see SizingResult.engineering); pitched roofs use the Solar API
 * segment pitch directly. When absent the sizer infers it from segment pitch.
 */
export type RoofType = "pitched" | "flat";

export interface Intake {
  address: string;
  lat: number;
  lng: number;
  monthlyBillEur: number;
  annualKwh?: number;
  /** Legacy boolean. New UI sets this from evPref==="yes". Both fields present until full migration. */
  ev: boolean;
  /** Three-state EV charger preference (new homeowner UI). */
  evPref?: Preference;
  /** Three-state battery preference (new homeowner UI). */
  wantsBattery?: Preference;
  /** Three-state heat pump preference (new homeowner UI). */
  wantsHeatPump?: Preference;
  /** Grid connection type (new homeowner UI). Optional — additive per frozen-contract rule; defaults to "on_grid". */
  gridType?: GridType;
  /** Building use class (commercial UI). Additive; defaults to "residential". */
  buildingType?: BuildingType;
  /** ISO-3166 code or free-text country for tariff/market context. Additive; defaults to "DE". */
  country?: string;
  /** Roof geometry class. Additive; when absent the sizer infers it from the Solar API segment pitch. */
  roofType?: RoofType;
  /** Optional commercial peak demand in kW, for demand-charge-aware sizing. */
  peakDemandKw?: number;
  heating: Heating;
  goal: Goal;
}

export interface BoM {
  panels: { brand: string; model: string; count: number; wp: number };
  inverter: { brand: string; model: string; kw: number };
  battery?: { brand: string; model: string; kwh: number };
  wallbox?: { brand: string; model: string; kw: number };
  heatPump?: { brand: string; model: string; kw: number };
  /**
   * Optional balance-of-system line items (mounting, DC string cabling, AC
   * combiner/protection, grid connection, installation labour) for commercial
   * proposals. Additive; residential BoMs may omit it and let the installer UI
   * synthesise a single "included" line. Each `eur` is the catalog-derived cost
   * for that line — never invented by the LLM.
   */
  balanceOfSystem?: { item: string; detail?: string; eur?: number }[];
  totalEur: number;
}

export interface Variant {
  id: string;
  label: "Best Margin" | "Best Close Rate" | "Best LTV";
  strategy: Strategy;
  bom: BoM;
  monthlySavingsEur: number;
  paybackYears: number;
  marginPct: number;
  winRatePct: number;
  /** 0..1 confidence score derived from KNN cohort size + match quality */
  confidence: number;
  /** Exactly 3 Reonic project IDs. Empty array means engine couldn't cite. */
  citedProjectIds: string[];
  /** "Risk: ..." sentence from rationale generation. */
  objection: string;
  /** % of annual consumption the system's generation covers (additive). */
  consumptionOffsetPct?: number;
  /** % of generation used on-site rather than exported to grid (additive). */
  selfConsumptionPct?: number;
}

export interface RoofSegment {
  pitchDegrees: number;
  azimuthDegrees: number;
  areaMeters2: number;
  annualSunshineHours: number;
}

export interface SizingResult {
  annualKwh: number;
  dailyKwh: number;
  usableRoofAreaM2: number;
  roofSegments: RoofSegment[];
  panelCount: number;
  systemKwp: number;
  batteryKwh: number;
  heatPumpKw?: number;
  annualYieldKwh: number;
  /** Hard-rule audit log shown in /debug. */
  rules: { name: string; pass: boolean; message: string }[];
  /**
   * Commercial design parameters a solar engineer would compute by hand:
   * ground-coverage ratio and inter-row spacing for flat-roof layouts, assumed
   * tilt, DC/AC inverter ratio, specific yield, performance ratio, and string
   * configuration. Optional + additive — residential/pitched results may omit
   * it. All values are deterministic engineering outputs, never LLM-generated.
   */
  engineering?: {
    groundCoverageRatio?: number;
    rowSpacingMeters?: number;
    tiltDegrees?: number;
    dcAcRatio?: number;
    specificYieldKwhPerKwp?: number;
    performanceRatio?: number;
    modulesPerString?: number;
    stringCount?: number;
    /**
     * Residential single-phase string-inverter sizing (lib/sizing/electrical.ts
     * computeResidentialStringSizing) and DC cable voltage-drop / wire-gauge
     * results (computeVoltageDrop / recommendWireGaugeMm2). Optional +
     * additive; nothing in sizeQuote()'s default pipeline populates these —
     * they exist for callers (e.g. a future UI layer) that invoke the
     * electrical.ts calculators directly and choose to surface the results.
     */
    residentialStringVocCold?: number;
    residentialModulesPerString?: number;
    residentialStringCount?: number;
    residentialWithinMpptWindow?: boolean;
    voltageDropPercent?: number;
    wireGaugeMm2?: number;
  };
  /**
   * Country/climate context for the yield model — gross irradiance and the
   * soiling + temperature losses that bring it down to the net specific yield
   * actually used. Additive; absent for legacy call sites. Lets the UI show a
   * credible, region-correct loss breakdown (critical for Gulf markets).
   */
  climate?: {
    country: string;
    grossKwhPerKwp: number;
    soilingLossPct: number;
    temperatureLossPct: number;
    netSpecificYieldKwhPerKwp: number;
  };
  /** Always exactly 3, in order: margin, closeRate (recommended), ltv. */
  variants: [Variant, Variant, Variant];
}

export interface ApiStatus {
  source: "live" | "cached" | "mock";
  status: "ok" | "timeout" | "error";
  latencyMs: number;
  message?: string;
}

export interface LeadPacket {
  id: string;
  createdAt: string;
  intake: Intake;
  sizing: SizingResult;
  selectedVariantId: string;
  installerStatus: "new" | "reviewed" | "approved";
  finalVariant?: Variant;
  shareUrl: string;
}
