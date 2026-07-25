import type { BuildingType, RoofSegment } from "@/lib/contracts";

/**
 * Curated demo dataset — the single source of truth for the free/offline
 * (MOCK_MODE) experience. Every mock provider (geocode, reverse-geocode,
 * roof-facts, and the /quote server roof measurement) resolves through the
 * helpers here, so the app behaves as if a real address was looked up.
 *
 * SWAP-TO-REAL CONTRACT
 * ---------------------
 * These fixtures are shaped like what the real pipeline produces AFTER mapping
 * (RoofSegment[] + a classification), so switching to paid Google APIs is a
 * config change, not a refactor: set the keys, unset MOCK_MODE, and the same
 * routes call Google instead of reading this file. Nothing downstream (sizing,
 * financials, deal flow, installer dashboard, 3D) needs to change.
 *
 * Currently seeded with the Berlin residential + commercial slice. Add more
 * cities (Dubai, Karachi, …) by appending entries — the resolvers below route
 * by coordinate proximity, then by keyword, so new entries "just work".
 */

export type DemoClassification = "residential" | "commercial";

export interface DemoLocation {
  id: string;
  /** Human label shown as the resolved "address". */
  label: string;
  city: string;
  /** ISO-3166 alpha-2 for tariff/market context. */
  country: string;
  lat: number;
  lng: number;
  classification: DemoClassification;
  /** Pre-detected building class (the "auto-detect" result in mock mode). */
  buildingType: BuildingType;
  roofType: "pitched" | "flat";
  totalAreaM2: number;
  /** Country retail electricity tariff (€/kWh) — kept for later country-aware
   *  pricing; the Berlin slice matches the existing DE defaults. */
  eurPerKwh: number;
  /** Query keywords that route free-text input to this location. */
  keywords: string[];
  /** Roof geometry in the SAME shape the real Solar-API mapper emits. */
  roofSegments: RoofSegment[];
}

// --- Berlin, Germany --------------------------------------------------------

const BERLIN_RESIDENTIAL: DemoLocation = {
  id: "berlin-residential",
  label: "Wohnhaus, Weißensee, Berlin, Germany",
  city: "Berlin",
  country: "DE",
  lat: 52.5601,
  lng: 13.427,
  classification: "residential",
  buildingType: "residential",
  roofType: "pitched",
  totalAreaM2: 84,
  eurPerKwh: 0.35,
  keywords: ["residential", "home", "house", "haus", "wohnhaus", "villa", "apartment", "weissensee", "weißensee"],
  // Classic gable roof: one sunny south face, one weak north face.
  roofSegments: [
    { pitchDegrees: 38, azimuthDegrees: 180, areaMeters2: 42, annualSunshineHours: 1150 },
    { pitchDegrees: 38, azimuthDegrees: 0, areaMeters2: 42, annualSunshineHours: 780 },
  ],
};

const BERLIN_COMMERCIAL: DemoLocation = {
  id: "berlin-commercial",
  label: "Logistikhalle, Lichtenberg, Berlin, Germany",
  city: "Berlin",
  country: "DE",
  lat: 52.529,
  lng: 13.489,
  classification: "commercial",
  buildingType: "warehouse",
  roofType: "flat",
  totalAreaM2: 860,
  eurPerKwh: 0.22,
  keywords: ["commercial", "office", "warehouse", "logistik", "logistikhalle", "halle", "industrial", "retail", "business", "lager", "lichtenberg"],
  // Large near-flat commercial roof — a single broad plane.
  roofSegments: [
    { pitchDegrees: 4, azimuthDegrees: 180, areaMeters2: 860, annualSunshineHours: 1080 },
  ],
};

export const DEMO_LOCATIONS: DemoLocation[] = [BERLIN_RESIDENTIAL, BERLIN_COMMERCIAL];

// --- Resolvers --------------------------------------------------------------

/** Parse a bare "lat, lng" string; returns null when it isn't coordinates. */
function parseLatLng(q: string): { lat: number; lng: number } | null {
  const m = q.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Whole-word match, so "warehouse" doesn't accidentally match the keyword
 *  "house" (substring matching would). Case-insensitive. */
function wordMatch(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

/** Nearest demo location to a coordinate (squared-degree distance is fine for
 *  the small, well-separated demo set). */
export function nearestDemoByCoords(lat: number, lng: number): DemoLocation {
  let best = DEMO_LOCATIONS[0];
  let bestD = Infinity;
  for (const loc of DEMO_LOCATIONS) {
    const d = (loc.lat - lat) ** 2 + (loc.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = loc;
    }
  }
  return best;
}

/**
 * Resolve a free-text query (the single address box) to a demo location:
 *   1. exact coordinates  → nearest location
 *   2. keyword match      → that classification / city
 *   3. fallback           → the first residential location
 * The manual building-type toggle in the intake always lets the user override
 * whatever this picks.
 */
export function resolveDemoLocation(query: string): DemoLocation {
  const coords = parseLatLng(query);
  if (coords) return nearestDemoByCoords(coords.lat, coords.lng);

  const scored = DEMO_LOCATIONS.map((loc) => ({
    loc,
    hits: loc.keywords.filter((k) => wordMatch(query, k)).length,
  })).sort((a, b) => b.hits - a.hits);

  if (scored[0]?.hits > 0) return scored[0].loc;
  return DEMO_LOCATIONS.find((l) => l.classification === "residential") ?? DEMO_LOCATIONS[0];
}

/** Mock roof measurement for a coordinate — mirrors the real roof-facts shape. */
export function mockRoofFacts(lat: number, lng: number): {
  segments: RoofSegment[];
  totalAreaM2: number;
  buildingType: BuildingType;
  classification: DemoClassification;
  roofType: "pitched" | "flat";
  label: string;
} {
  const loc = nearestDemoByCoords(lat, lng);
  return {
    segments: loc.roofSegments,
    totalAreaM2: loc.totalAreaM2,
    buildingType: loc.buildingType,
    classification: loc.classification,
    roofType: loc.roofType,
    label: loc.label,
  };
}
