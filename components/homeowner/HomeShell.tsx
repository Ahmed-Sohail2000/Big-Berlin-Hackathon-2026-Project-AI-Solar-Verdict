"use client";

import { useEffect, useState } from "react";
import { IntakePanel } from "./IntakePanel";
import { RoofPanelOverlay3D } from "./RoofPanelOverlay3D";
import { SyntheticRoof3D } from "./SyntheticRoof3D";
import { RuhrCinematic } from "./RuhrCinematic";
import { LiveRoofFacts } from "./LiveRoofFacts";
import { InstallerApprovedToast } from "./InstallerApprovedToast";
import { LayerSwitcher, type LayerMode } from "./LayerSwitcher";
import { HeatmapView } from "./HeatmapView";
import { RoofPreview } from "./RoofPreview";
import type { SolarPanelEntry } from "@/components/installer/PanelOverlayCesium";
import type { RoofSegment } from "@/lib/contracts";

interface RoofFactsState {
  segments: RoofSegment[];
  totalAreaM2: number;
  imageryDate?: { year: number; month: number; day: number };
  /** Google's AI per-panel placement (top 200 by yield). Optional — absent when
   *  the Solar API / fixture has no per-panel data for this location. */
  solarPanels?: SolarPanelEntry[];
  source: "live" | "cached" | "mock";
  status?: "ok" | "error" | "timeout";
  message?: string;
}

export function HomeShell() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [roofFacts, setRoofFacts] = useState<RoofFactsState | null>(null);
  const [loadingRoof, setLoadingRoof] = useState(false);
  const [layerMode, setLayerMode] = useState<LayerMode>("photoreal");

  // In MOCK_MODE there are no Google keys, so the photoreal Cesium tiles can't
  // load. Instead of the "3D disabled" placeholder, render a fully-offline
  // procedural 3D simulation of the commercial roof + AI panel array.
  const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

  useEffect(() => {
    if (!coords) {
      setRoofFacts(null);
      return;
    }

    const controller = new AbortController();
    setLoadingRoof(true);

    fetch(`/api/roof-facts?lat=${coords.lat}&lng=${coords.lng}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setRoofFacts(data))
      .catch(() => {
        // ignore aborts AND silent failures — UI still shows last data
      })
      .finally(() => setLoadingRoof(false));

    return () => controller.abort();
  }, [coords]);

  return (
    <div className="relative min-h-[calc(100dvh-64px)] bg-[#0A0E1A] text-[#F7F8FA] flex flex-col">
      {/* Nav is owned by the landing page (app/page.tsx) — HomeShell renders only the two-pane app. */}
      {/* Two-pane: 3D / satellite roof left, intake right */}
      <section className="flex-1 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-0">
        {/* LEFT */}
        <div className="relative h-[42vh] lg:h-auto bg-[#0A0E1A] border-b lg:border-b-0 lg:border-r border-[#1A1F2A] overflow-hidden">
          {coords ? (
            <>
              {layerMode === "photoreal" &&
                (isMock ? (
                  <SyntheticRoof3D
                    address={address}
                    totalAreaM2={roofFacts?.totalAreaM2}
                    panelCount={roofFacts?.solarPanels?.length}
                  />
                ) : (
                  <RoofPanelOverlay3D
                    coords={coords}
                    address={address}
                    panels={roofFacts?.solarPanels ?? []}
                  />
                ))}
              {layerMode === "heatmap"   && <HeatmapView coords={coords} address={address} />}
              {layerMode === "map"       && <RoofPreview coords={coords} address={address} />}
              <LayerSwitcher value={layerMode} onChange={setLayerMode} />
            </>
          ) : (
            <RuhrCinematic />
          )}
          
          {/* Live Roof Facts Strip */}
          <div className="absolute bottom-16 left-4 right-4 z-20 sm:max-w-2xl">
            {(roofFacts || loadingRoof) && (
              <LiveRoofFacts
                segments={roofFacts?.segments ?? []}
                totalAreaM2={roofFacts?.totalAreaM2}
                imageryDate={roofFacts?.imageryDate}
                source={roofFacts?.source ?? "mock"}
                status={roofFacts?.status}
                message={roofFacts?.message}
                loading={loadingRoof}
              />
            )}
          </div>

          {!coords && (
            <div className="absolute bottom-6 left-6 text-xs text-[#5B6470] z-10">
              Enter your address or tap &ldquo;Use my location&rdquo; to see your roof
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex flex-col px-6 sm:px-10 lg:px-12 py-6 lg:py-8 overflow-y-auto lg:max-h-[calc(100dvh-64px)]">
          <IntakePanel
            onLocate={(c, a) => {
              setCoords(c);
              setAddress(a);
            }}
          />
        </div>
      </section>

      {/* Push notification when installer approves the lead (polls every 2s) */}
      <InstallerApprovedToast />
    </div>
  );
}
