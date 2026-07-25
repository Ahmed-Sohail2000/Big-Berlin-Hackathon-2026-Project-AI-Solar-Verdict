import Link from "next/link";
import { getResidentialTariff } from "@/lib/api/tavily";
import { getBuildingInsights } from "@/lib/api/solar";
import { resolveDemoLocation, nearestDemoByCoords } from "@/data/fixtures/demo-locations";
import { sizeQuoteWithRationale } from "@/lib/sizing/calculate";
import { VariantCardStack } from "@/components/homeowner/VariantCardStack";
import { SendToInstaller } from "@/components/homeowner/SendToInstaller";
import { SpouseShareCard } from "@/components/homeowner/SpouseShareCard";
import { tryParseCoords } from "@/lib/parse-coords";
import type { Intake, Preference, RoofSegment } from "@/lib/contracts";

function asPref(v: string | undefined, fallback: Preference = "idk"): Preference {
  return v === "yes" || v === "no" || v === "idk" ? v : fallback;
}

export const dynamic = "force-dynamic";

interface SearchParams {
  address?: string;
  bill?: string;
  ev?: string;
  heating?: string;
  goal?: string;
  // New preference fields from the simplified intake (5-field form).
  evPref?: string;
  wantsBattery?: string;
  wantsHeatPump?: string;
  annualKwh?: string;
  gridType?: string;
  // Commercial intake fields (additive per the frozen contract).
  buildingType?: string;
  country?: string;
  roofType?: string;
  peakDemandKw?: string;
}

interface GeocodeOk {
  lat: number;
  lng: number;
  formattedAddress: string;
}

async function geocode(address: string, key: string | undefined): Promise<GeocodeOk | null> {
  // MOCK_MODE resolves every query to the fixture location, matching the
  // /api/forward-geocode behavior — this keeps the fixture-backed chain
  // (geocode → getBuildingInsights → sizing) returning real data offline.
  if (process.env.MOCK_MODE === "true") {
    // Resolve the typed address to the nearest curated demo location so the
    // sizing runs on the right roof (residential vs commercial).
    const loc = resolveDemoLocation(address);
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: loc.label,
    };
  }
  if (!key) return null;

  // No country filter — global coverage
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const top = data.results?.[0];
    if (!top) return null;
    return {
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      formattedAddress: top.formatted_address,
    };
  } catch {
    return null;
  }
}

interface RoofMeasurement {
  segments: RoofSegment[];
  source: "live" | "cached" | "mock";
}

interface BuildingInsightsLite {
  solarPotential?: {
    roofSegmentStats?: Array<{
      pitchDegrees?: number;
      azimuthDegrees?: number;
      stats?: { areaMeters2?: number; sunshineQuantiles?: number[] };
    }>;
  };
}

async function getRoofMeasurement(lat: number, lng: number): Promise<RoofMeasurement> {
  // MOCK_MODE: measure the nearest curated demo roof — same source the
  // /api/roof-facts mock branch uses, so the pane and the quote agree.
  if (process.env.MOCK_MODE === "true") {
    const loc = nearestDemoByCoords(lat, lng);
    return { segments: loc.roofSegments, source: "mock" };
  }
  // Goes through lib/api/solar so MOCK_MODE fixtures, the 4s timeout, and the
  // cached fallback all apply — identical behavior to /api/roof-facts.
  try {
    const { data, apiStatus } = await getBuildingInsights(lat, lng);
    const segs = (data as BuildingInsightsLite | null)?.solarPotential?.roofSegmentStats ?? [];
    return {
      segments: segs.map((s) => ({
        pitchDegrees: s.pitchDegrees ?? 0,
        azimuthDegrees: s.azimuthDegrees ?? 180,
        areaMeters2: s.stats?.areaMeters2 ?? 0,
        annualSunshineHours: s.stats?.sunshineQuantiles?.[5] ?? 1000,
      })),
      source: apiStatus.source,
    };
  } catch {
    return { segments: [], source: "mock" };
  }
}

function extractPostcode(address: string): string | undefined {
  return address.match(/\b\d{5}\b/)?.[0];
}

function extractCity(address: string): string | undefined {
  const match = address.match(/\b\d{5}\s+([^,]+)/);
  return match?.[1]?.trim();
}

function formatTariffLine(tariff: Awaited<ReturnType<typeof getResidentialTariff>>): string {
  const value = `€${tariff.eurPerKwh.toFixed(2)}/kWh`;
  if (tariff.source === "tavily-live") {
    return `Tariff source: Tavily live (${value}) · ${tariff.query}`;
  }
  return `Tariff: default ${value}`;
}

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!params.address) {
    return (
      <main className="min-h-dvh bg-[#0A0E1A] text-[#F7F8FA] flex flex-col items-center justify-center px-6 py-12">
        <h1 className="text-2xl font-semibold mb-2">Missing address</h1>
        <p className="text-[#9BA3AF] text-sm mb-6">Go back and enter your home address.</p>
        <Link href="/" className="rounded-lg bg-[#3DAEFF] px-4 py-2 text-sm font-semibold text-[#0A0E1A]">
          ← Back
        </Link>
      </main>
    );
  }

  // Accept raw coordinates in many formats (decimal, DMS, etc.) — skip geocoding when matched
  const parsed = tryParseCoords(params.address);
  const directCoords = parsed ? { lat: parsed.lat, lng: parsed.lng, formattedAddress: parsed.formatted } : null;
  const geo = directCoords ?? (await geocode(params.address, key));
  const fallbackSegment: RoofSegment = {
    pitchDegrees: 35,
    azimuthDegrees: 180,
    areaMeters2: 60,
    annualSunshineHours: 1100,
  };
  const measurement = geo
    ? await getRoofMeasurement(geo.lat, geo.lng)
    : { segments: [] as RoofSegment[], source: "mock" as const };
  const measuredSegments = measurement.segments;
  const hasSolarMeasurement = measuredSegments.length > 0;
  const segmentsForSizing = hasSolarMeasurement ? measuredSegments : [fallbackSegment];
  const measurementLabel = !hasSolarMeasurement
    ? "Estimated (Solar API has no coverage here)"
    : measurement.source === "live"
      ? "Measured live"
      : "Measured (cached simulation data)";

  const evPref = asPref(params.evPref, params.ev === "true" ? "yes" : "idk");
  const wantsBattery = asPref(params.wantsBattery);
  const wantsHeatPump = asPref(params.wantsHeatPump);
  const parsedAnnualKwh = params.annualKwh ? Number(params.annualKwh) : undefined;

  // Commercial intake fields (additive per the frozen contract).
  const BUILDING_TYPES: Intake["buildingType"][] = [
    "residential",
    "office",
    "retail",
    "warehouse",
    "industrial",
    "agricultural",
  ];
  const buildingType = BUILDING_TYPES.includes(params.buildingType as Intake["buildingType"])
    ? (params.buildingType as Intake["buildingType"])
    : undefined;
  const roofType =
    params.roofType === "flat" || params.roofType === "pitched" ? params.roofType : undefined;
  const parsedPeakDemandKw = params.peakDemandKw ? Number(params.peakDemandKw) : undefined;

  const intake: Intake = {
    address: geo?.formattedAddress ?? params.address,
    lat: geo?.lat ?? 0,
    lng: geo?.lng ?? 0,
    monthlyBillEur: Number(params.bill ?? "120"),
    annualKwh: parsedAnnualKwh && parsedAnnualKwh > 0 ? parsedAnnualKwh : undefined,
    ev: evPref === "yes" || params.ev === "true",
    evPref,
    wantsBattery,
    wantsHeatPump,
    gridType: params.gridType === "off_grid" || params.gridType === "hybrid" ? params.gridType : "on_grid",
    buildingType,
    country: params.country || undefined,
    roofType,
    peakDemandKw:
      parsedPeakDemandKw && parsedPeakDemandKw > 0 ? parsedPeakDemandKw : undefined,
    heating: (params.heating ?? "gas") as Intake["heating"],
    goal: (params.goal ?? "lower_bill") as Intake["goal"],
  };

  // Tariff drives the savings math. In MOCK_MODE use the resolved demo
  // location's country tariff (so Dubai financials use the UAE rate, not a
  // German one) and skip the live Tavily call; otherwise look it up live.
  const demoLoc =
    process.env.MOCK_MODE === "true" ? nearestDemoByCoords(intake.lat, intake.lng) : null;
  const tariff = demoLoc
    ? {
        eurPerKwh: demoLoc.eurPerKwh,
        source: "fallback" as const,
        query: `${demoLoc.city} demo tariff`,
        latencyMs: 0,
      }
    : await getResidentialTariff({
        lat: intake.lat,
        lng: intake.lng,
        postcode: extractPostcode(intake.address),
        city: extractCity(intake.address),
      });

  const sizing = await sizeQuoteWithRationale(intake, segmentsForSizing, tariff.eurPerKwh);

  return (
    <main className="relative min-h-dvh bg-[#0A0E1A] text-[#F7F8FA] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-5 sm:px-10 z-30">
        <Link href="/" className="text-base font-semibold tracking-tight">Verdict</Link>
        <Link href="/" className="text-sm text-[#9BA3AF] hover:text-[#F7F8FA]">← New quote</Link>
      </nav>

      <section className="flex-1 max-w-3xl w-full mx-auto px-6 sm:px-8 py-6 lg:py-12 flex flex-col gap-8">
        {/* Address + intake summary */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`flex items-center gap-1.5 rounded border bg-[#0A0E1A] px-2 py-0.5 ${
                measurement.source === "live" && hasSolarMeasurement
                  ? "border-[#62E6A7]/40 text-[#62E6A7]"
                  : "border-[#F2B84B]/40 text-[#F2B84B]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-md ${
                  measurement.source === "live" && hasSolarMeasurement ? "bg-[#62E6A7]" : "bg-[#F2B84B]"
                }`}
              />
              {measurementLabel}
            </span>
            <span className="text-[#5B6470]">·</span>
            <span className="text-[#9BA3AF] truncate">{intake.address}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
            Three Reonic-grounded options for your home.
          </h1>
          <p className="text-sm text-[#9BA3AF]">
            {sizing.systemKwp} kWp system &middot; {sizing.annualKwh.toLocaleString()} kWh/yr demand &middot; {measuredSegments.length} roof face{measuredSegments.length !== 1 ? "s" : ""} measured
          </p>
          <p className="text-xs text-[#9BA3AF]">
            {formatTariffLine(tariff)}
          </p>
        </header>

        {/* The three variants */}
        <VariantCardStack variants={sizing.variants} />

        {/* Send to installer — POSTs the real lead with this homeowner's intake + live roof segments */}
        <SendToInstaller
          address={intake.address}
          coords={{ lat: intake.lat, lng: intake.lng }}
          intake={{
            monthlyBillEur: intake.monthlyBillEur,
            annualKwh: intake.annualKwh,
            ev: intake.ev,
            evPref: intake.evPref,
            wantsBattery: intake.wantsBattery,
            wantsHeatPump: intake.wantsHeatPump,
            gridType: intake.gridType,
            buildingType: intake.buildingType,
            country: intake.country,
            roofType: intake.roofType,
            peakDemandKw: intake.peakDemandKw,
            heating: intake.heating,
            goal: intake.goal,
          }}
          roofSegments={segmentsForSizing}
        />

        {/* Spouse-share viral moment */}
        <SpouseShareCard
          monthlySavingsEur={sizing.variants[1].monthlySavingsEur}
          paybackYears={sizing.variants[1].paybackYears}
          systemKwp={sizing.systemKwp}
          address={intake.address}
        />

        {/* Trust line */}
        <p className="text-[11px] text-[#5B6470] text-center">
          Recommendations cite real Reonic projects from your region. No purchase made — installer reviews and confirms.
        </p>
      </section>
    </main>
  );
}
