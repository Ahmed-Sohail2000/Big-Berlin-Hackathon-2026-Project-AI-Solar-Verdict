"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// three.js only ships when this mounts; ssr:false because R3F's Canvas touches
// `window` immediately.
const SyntheticRoof3DScene = dynamic(() => import("./SyntheticRoof3DScene"), {
  ssr: false,
  loading: () => <Skeleton />,
});

function Skeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0A0E1A]">
      <div className="relative flex items-center gap-2 rounded-md border border-[#3DAEFF]/40 bg-[#0A0E1A]/80 backdrop-blur px-3 py-1.5 text-xs text-[#F7F8FA]">
        <span className="inline-block h-3 w-3 rounded-md border-2 border-[#3DAEFF]/30 border-t-[#3DAEFF] animate-spin" />
        Building 3D simulation…
      </div>
    </div>
  );
}

interface Props {
  address?: string | null;
  totalAreaM2?: number;
  panelCount?: number;
  tiltDegrees?: number;
  rowSpacingMeters?: number;
  variant?: "residential" | "commercial";
}

/**
 * Offline commercial-roof 3D simulation shown in MOCK_MODE in place of the
 * photoreal Cesium view. Fully procedural — no API key or network — so the
 * "simulation" experience is a real, orbitable building with the AI panel
 * array, not a disabled placeholder.
 */
export function SyntheticRoof3D({
  address,
  totalAreaM2,
  panelCount,
  tiltDegrees,
  rowSpacingMeters,
  variant = "commercial",
}: Props) {
  return (
    <div className="absolute inset-0">
      <Suspense fallback={<Skeleton />}>
        <SyntheticRoof3DScene
          totalAreaM2={totalAreaM2}
          panelCount={panelCount}
          tiltDegrees={tiltDegrees}
          rowSpacingMeters={rowSpacingMeters}
          variant={variant}
        />
      </Suspense>

      {/* Honest simulation badge (top-left) */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 flex items-center gap-2 rounded-md border border-[#F2B84B]/40 bg-[#0A0E1A]/80 backdrop-blur px-3 py-1.5 text-xs text-[#F7F8FA]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-md bg-[#F2B84B] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-md bg-[#F2B84B]" />
        </span>
        Simulation · {variant === "residential" ? "residential rooftop" : "commercial roof array"}
      </div>

      {/* Address + panel-count caption (bottom-left, above the roof-facts strip) */}
      {address && (
        <div className="pointer-events-none absolute bottom-28 left-4 z-10 max-w-[80%] truncate rounded-md border border-[#2A3038] bg-[#0A0E1A]/80 backdrop-blur px-3 py-1.5 text-[11px] text-[#9BA3AF]">
          {address}
          {panelCount ? ` · ${panelCount} panels (AI layout)` : ""}
        </div>
      )}
    </div>
  );
}

export default SyntheticRoof3D;
