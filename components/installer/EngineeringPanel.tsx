"use client";

import type { SizingResult } from "@/lib/contracts";

/**
 * Technical design parameters a solar engineer would sign off on.
 *
 * Every value is a deterministic engineering output from the sizer
 * (SizingResult.engineering) — never LLM-generated. All fields are optional
 * and additive: the panel only renders the tiles that are actually present,
 * and the whole card is hidden by the caller when `engineering` is absent
 * (residential / pitched-roof results legitimately omit it).
 */

type Engineering = NonNullable<SizingResult["engineering"]>;

interface Props {
  engineering: Engineering;
}

interface Tile {
  label: string;
  value: string;
  hint?: string;
}

function fmt(n: number, digits = 2): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

export function EngineeringPanel({ engineering }: Props) {
  const tiles: Tile[] = [];

  if (typeof engineering.tiltDegrees === "number") {
    tiles.push({ label: "Array tilt", value: `${fmt(engineering.tiltDegrees, 1)}°` });
  }
  if (typeof engineering.groundCoverageRatio === "number") {
    tiles.push({
      label: "Ground coverage",
      value: fmt(engineering.groundCoverageRatio),
      hint: "GCR",
    });
  }
  if (typeof engineering.rowSpacingMeters === "number") {
    tiles.push({
      label: "Inter-row spacing",
      value: `${fmt(engineering.rowSpacingMeters)} m`,
    });
  }
  if (typeof engineering.dcAcRatio === "number") {
    tiles.push({ label: "DC/AC ratio", value: `${fmt(engineering.dcAcRatio)} : 1` });
  }
  if (typeof engineering.specificYieldKwhPerKwp === "number") {
    tiles.push({
      label: "Specific yield",
      value: `${Math.round(engineering.specificYieldKwhPerKwp).toLocaleString()} kWh/kWp`,
    });
  }
  if (typeof engineering.performanceRatio === "number") {
    // PR is a 0..1 ratio; present as a percentage for engineer legibility.
    tiles.push({
      label: "Performance ratio",
      value: `${Math.round(engineering.performanceRatio * 100)}%`,
    });
  }
  if (
    typeof engineering.modulesPerString === "number" &&
    typeof engineering.stringCount === "number"
  ) {
    tiles.push({
      label: "String configuration",
      value: `${engineering.modulesPerString} × ${engineering.stringCount}`,
      hint: "modules/string × strings",
    });
  } else if (typeof engineering.modulesPerString === "number") {
    tiles.push({
      label: "Modules per string",
      value: String(engineering.modulesPerString),
    });
  } else if (typeof engineering.stringCount === "number") {
    tiles.push({ label: "String count", value: String(engineering.stringCount) });
  }

  if (tiles.length === 0) return null;

  return (
    <section className="rounded-lg border border-[#2A3038] bg-[#12161C] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3AF]">
          Technical design · engineering parameters
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-[#5B6470]">
          Deterministic
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-md border border-[#2A3038] bg-[#0A0E1A] px-2.5 py-2"
          >
            <div className="text-[9px] uppercase tracking-wider text-[#5B6470]">
              {tile.label}
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#F7F8FA]">
              {tile.value}
            </div>
            {tile.hint ? (
              <div className="mt-0.5 text-[9px] text-[#5B6470]">{tile.hint}</div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-[#5B6470]">
        Engineering parameters computed by the sizer for this roof — tilt, spacing and
        string layout a certified installer can build to.
      </p>
    </section>
  );
}
