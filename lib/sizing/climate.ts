// Country/climate-aware specific-yield model. Solar output is NOT the same
// everywhere: the Gulf has ~2x Germany's irradiance but loses a large share to
// dust/soiling and high-temperature derating, while Germany loses little. A
// German yield number applied to a Dubai roof is simply wrong — this module
// makes the energy sizing (and therefore savings/payback) credible per market.
//
// References (UAE): panel temps hit 65-75°C in summer (~16% loss at 65°C, ~0.4%
// per °C over 25°C STC); dust soiling causes ~15-19% loss without regular
// cleaning (DEWA even runs autonomous soiling detectors). UAE net specific
// yield lands around ~1500-1600 kWh/kWp/yr despite ~2100 gross.

export interface ClimateProfile {
  /** ISO-3166 alpha-2 (or "XX" for the global fallback). */
  code: string;
  label: string;
  /** Gross plane-of-array specific yield before soiling + temperature (kWh/kWp/yr). */
  grossKwhPerKwp: number;
  /** Fractional loss from dust/soiling (0-1). */
  soilingLossPct: number;
  /** Fractional loss from high-temperature derating (0-1). */
  temperatureLossPct: number;
  /**
   * Net specific yield actually used for energy sizing (kWh/kWp/yr).
   * Authoritative — Germany stays at the engine's long-standing 950 so existing
   * behaviour (and the golden profiles) is unchanged.
   */
  netSpecificYieldKwhPerKwp: number;
}

const PROFILES: Record<string, ClimateProfile> = {
  DE: {
    code: "DE",
    label: "Germany",
    grossKwhPerKwp: 1130,
    soilingLossPct: 0.03,
    temperatureLossPct: 0.06,
    netSpecificYieldKwhPerKwp: 950,
  },
  AE: {
    code: "AE",
    label: "United Arab Emirates",
    grossKwhPerKwp: 2100,
    soilingLossPct: 0.14,
    temperatureLossPct: 0.14,
    netSpecificYieldKwhPerKwp: 1530,
  },
  PK: {
    code: "PK",
    label: "Pakistan",
    grossKwhPerKwp: 1850,
    soilingLossPct: 0.1,
    temperatureLossPct: 0.12,
    netSpecificYieldKwhPerKwp: 1450,
  },
  US: {
    code: "US",
    label: "United States",
    grossKwhPerKwp: 1600,
    soilingLossPct: 0.04,
    temperatureLossPct: 0.09,
    netSpecificYieldKwhPerKwp: 1400,
  },
  GB: {
    code: "GB",
    label: "United Kingdom",
    grossKwhPerKwp: 1050,
    soilingLossPct: 0.02,
    temperatureLossPct: 0.04,
    netSpecificYieldKwhPerKwp: 900,
  },
};

const DEFAULT: ClimateProfile = {
  code: "XX",
  label: "Global average",
  grossKwhPerKwp: 1450,
  soilingLossPct: 0.06,
  temperatureLossPct: 0.09,
  netSpecificYieldKwhPerKwp: 1200,
};

/** Climate profile for a country. Absent/unknown → Germany (net 950), so the
 *  default behaviour and golden profiles never change. */
export function climateProfileFor(country?: string): ClimateProfile {
  if (!country) return PROFILES.DE;
  return PROFILES[country.toUpperCase()] ?? DEFAULT;
}
