import { NextRequest, NextResponse } from "next/server";
import { resolveDemoLocation } from "@/data/fixtures/demo-locations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (!q) return NextResponse.json({ error: "missing ?q parameter" }, { status: 400 });

  if (process.env.MOCK_MODE === 'true') {
    // Snap the typed query to the nearest curated demo location and hand back
    // the detected building class so the intake can auto-select it (with a
    // manual override still available).
    const loc = resolveDemoLocation(q);
    return NextResponse.json({
      address: loc.label,
      lat: loc.lat,
      lng: loc.lng,
      buildingType: loc.buildingType,
      classification: loc.classification,
      roofType: loc.roofType,
      country: loc.country,
    });
  }

  if (!key) return NextResponse.json({ error: "server missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  // No country filter — accept any address worldwide (Solar API will gracefully 404 if no coverage)
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&language=en`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return NextResponse.json({ error: `upstream HTTP ${res.status}` }, { status: 502 });
    const data = await res.json();
    const top = data.results?.[0];
    if (!top) return NextResponse.json({ error: "no match" }, { status: 404 });
    return NextResponse.json({
      address: top.formatted_address,
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return NextResponse.json({ error: msg }, { status: 504 });
  }
}
