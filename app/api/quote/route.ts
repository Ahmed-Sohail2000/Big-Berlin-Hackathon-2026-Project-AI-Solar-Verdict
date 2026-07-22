import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoalSchema, GridTypeSchema, HeatingSchema, IntakeSchema } from "@/data/schema";
import { MOCK_GEOCODE_RESULT } from "@/lib/api/mock-location";
import { getBuildingInsights } from "@/lib/api/solar";
import { getResidentialTariff } from "@/lib/api/tavily";
import { sizeQuote } from "@/lib/sizing/calculate";
import type { ApiStatus, Intake, RoofSegment } from "@/lib/contracts";

export const dynamic = "force-dynamic";

const QuoteQuerySchema = z.object({
  address: z.string().min(1),
  bill: z.coerce.number().positive().default(120),
  ev: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  heating: HeatingSchema.default("gas"),
  goal: GoalSchema.default("lower_bill"),
  gridType: GridTypeSchema.optional(),
  annualKwh: z.coerce.number().positive().optional(),
});

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  apiStatus: ApiStatus;
}

async function geocode(address: string): Promise<GeocodeResult | null> {
  // MOCK_MODE resolves every query to the fixture location (Reichstag) so the
  // fixture-backed chain returns real data offline — same as /api/forward-geocode.
  if (process.env.MOCK_MODE === "true") {
    return {
      lat: MOCK_GEOCODE_RESULT.lat,
      lng: MOCK_GEOCODE_RESULT.lng,
      formattedAddress: MOCK_GEOCODE_RESULT.address,
      apiStatus: { source: "mock", status: "ok", latencyMs: 0, message: "Mock mode enabled" },
    };
  }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const t0 = Date.now();
  // No country filter — global coverage
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    const top = data.results?.[0];
    if (!top) return null;
    return {
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      formattedAddress: top.formatted_address,
      apiStatus: { source: "live", status: "ok", latencyMs: Date.now() - t0 },
    };
  } catch {
    return null;
  }
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

async function getRoofSegments(
  lat: number,
  lng: number,
): Promise<{ segments: RoofSegment[]; apiStatus: ApiStatus }> {
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
      apiStatus,
    };
  } catch (e) {
    return {
      segments: [],
      apiStatus: {
        source: "mock",
        status: "error",
        latencyMs: 0,
        message: e instanceof Error ? e.message : "Solar API unavailable",
      },
    };
  }
}

function extractPostcode(address: string): string | undefined {
  return address.match(/\b\d{5}\b/)?.[0];
}

function extractCity(address: string): string | undefined {
  const match = address.match(/\b\d{5}\s+([^,]+)/);
  return match?.[1]?.trim();
}

export async function GET(req: NextRequest) {
  const t0 = Date.now();
  const query = QuoteQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!query.success) {
    return NextResponse.json(
      {
        error: "invalid query parameters",
        issues: query.error.issues.map(
          (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
        ),
      },
      { status: 400 },
    );
  }
  const params = query.data;

  // 1. Geocode (mock-aware)
  const geo = await geocode(params.address);
  if (!geo) {
    return NextResponse.json(
      {
        error: "could not geocode address",
        address: params.address,
        hint: "Address autocomplete + cached fallback arriving in Sprint 3.",
      },
      { status: 422 },
    );
  }

  // 2. Roof segments via lib/api/solar (live / cached / mock — honest badge)
  const roof = await getRoofSegments(geo.lat, geo.lng);
  const roofSegments = roof.segments;

  // 3. Intake — validated against the canonical Zod schema before sizing.
  const intake: Intake = IntakeSchema.parse({
    address: geo.formattedAddress,
    lat: geo.lat,
    lng: geo.lng,
    monthlyBillEur: params.bill,
    annualKwh: params.annualKwh,
    ev: params.ev,
    gridType: params.gridType,
    heating: params.heating,
    goal: params.goal,
  });

  const tariff = await getResidentialTariff({
    lat: geo.lat,
    lng: geo.lng,
    postcode: extractPostcode(geo.formattedAddress),
    city: extractCity(geo.formattedAddress),
  });

  // 4. Size (pure deterministic math; gridType policy applied inside)
  const sizing = sizeQuote(
    intake,
    roofSegments.length > 0
      ? roofSegments
      : [{ pitchDegrees: 35, azimuthDegrees: 180, areaMeters2: 60, annualSunshineHours: 1100 }],
    tariff.eurPerKwh,
  );

  return NextResponse.json(
    {
      ok: true,
      latencyMs: Date.now() - t0,
      address: geo.formattedAddress,
      coordinates: { lat: geo.lat, lng: geo.lng },
      roofSegmentsFromSolarApi: roofSegments.length,
      tariff,
      intake,
      sizing,
      // Honest per-dependency source badges (live | cached | mock).
      sources: {
        geocode: geo.apiStatus,
        solar: roof.apiStatus,
        tariff: tariff.source,
      },
    },
    { status: 200 },
  );
}
