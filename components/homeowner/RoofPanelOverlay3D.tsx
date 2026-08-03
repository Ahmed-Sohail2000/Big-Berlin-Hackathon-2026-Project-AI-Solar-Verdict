"use client";

import { useState } from "react";
import { CesiumRoofView } from "./CesiumRoofView";
import {
  PanelOverlayCesium,
  type SolarPanelEntry,
} from "@/components/installer/PanelOverlayCesium";

/**
 * Homeowner/business-facing 3D roof with the AI's recommended panel layout
 * drawn ON the photoreal mesh. Composes the shared, installer-owned
 * PanelOverlayCesium (imported read-only) with the homeowner CesiumRoofView.
 *
 * The building owner literally sees panels placed on their building the moment
 * an address resolves. There is no editing here — panels are display-only:
 * removedKeys is always empty and clicks are a no-op (the installer side owns
 * the editable version).
 *
 * Degrades gracefully: when `panels` is empty (e.g. MOCK_MODE fixtures with no
 * per-panel data, or a location with no Solar coverage) the overlay renders
 * nothing and the bare roof shows — never a crash.
 */

// Empty, stable set — this view never removes panels.
const NO_REMOVED_KEYS: Set<string> = new Set();
const noopPanelClick = (): void => {};

interface Props {
  coords: { lat: number; lng: number };
  address: string | null;
  panels: SolarPanelEntry[];
}

export function RoofPanelOverlay3D({ coords, address, panels }: Props) {
  // Viewer instance bubbled up from CesiumRoofView once the photoreal mesh is
  // mounted. `unknown` keeps us off `any` while still satisfying the overlay's
  // permissive viewer prop.
  const [viewer, setViewer] = useState<unknown>(null);
  const hasPanels = panels.length > 0;

  return (
    <>
      <CesiumRoofView coords={coords} address={address} onViewerReady={setViewer} />
      <PanelOverlayCesium
        viewer={viewer}
        panels={panels}
        desiredCount={panels.length}
        removedKeys={NO_REMOVED_KEYS}
        onPanelClick={noopPanelClick}
        visible={hasPanels}
      />
      {hasPanels && (
        <div className="absolute left-4 top-4 z-20 rounded-md border border-[#3DAEFF]/40 bg-[#0A0E1A]/85 px-3 py-1.5 text-xs text-[#F7F8FA] backdrop-blur">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-md bg-[#3DAEFF] align-middle" />
          AI-placed panel layout on your roof
        </div>
      )}
    </>
  );
}

export default RoofPanelOverlay3D;
