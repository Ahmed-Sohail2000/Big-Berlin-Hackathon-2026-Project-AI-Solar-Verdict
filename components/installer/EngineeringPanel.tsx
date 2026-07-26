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
  /** Sizer-computed design block. Absent on residential/pitched results. */
  engineering?: Engineering;
  /** Dominant array orientation, e.g. "S · 178°" or "Flat". Always available
   *  from the roof segments, so the engineer sees how the AI oriented the array
   *  even when the commercial engineering block is absent. */
  azimuthLabel?: string;
  /** Median roof pitch shown as array tilt when the sizer omitted tiltDegrees. */
  tiltFallbackDegrees?: number;
  /** Country/climate yield model — gross irradiance and the soiling +
   *  temperature losses down to the net specific yield used for sizing. */
  climate?: NonNullable<SizingResult["climate"]>;
}

interface Tile {
  label: string;
  value: string;
  hint?: string;
}

function fmt(n: number, digits = 2): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

export function EngineeringPanel({
  engineering,
  azimuthLabel,
  tiltFallbackDegrees,
  climate,
}: Props) {
  const tiles: Tile[] = [];
  const eng = engineering ?? {};

  // Orientation first — it's the AI placement signal an engineer reads before
  // anything else (which way, how steep is the array).
  if (azimuthLabel) {
    tiles.push({
      label: "Array orientation",
      value: azimuthLabel,
      hint: "AI-placed azimuth",
    });
  }
  const tiltDegrees =
    typeof eng.tiltDegrees === "number" ? eng.tiltDegrees : tiltFallbackDegrees;
  if (typeof tiltDegrees === "number") {
    tiles.push({ label: "Array tilt", value: `${fmt(tiltDegrees, 1)}°` });
  }
  if (typeof eng.groundCoverageRatio === "number") {
    tiles.push({
      label: "Ground coverage",
      value: fmt(eng.groundCoverageRatio),
      hint: "GCR",
    });
  }
  if (typeof eng.rowSpacingMeters === "number") {
    tiles.push({
      label: "Inter-row spacing",
      value: `${fmt(eng.rowSpacingMeters)} m`,
    });
  }
  if (typeof eng.dcAcRatio === "number") {
    tiles.push({ label: "DC/AC ratio", value: `${fmt(eng.dcAcRatio)} : 1` });
  }
  if (typeof eng.specificYieldKwhPerKwp === "number") {
    tiles.push({
      label: "Specific yield",
      value: `${Math.round(eng.specificYieldKwhPerKwp).toLocaleString()} kWh/kWp`,
    });
  }
  if (typeof eng.performanceRatio === "number") {
    // PR is a 0..1 ratio; present as a percentage for engineer legibility.
    tiles.push({
      label: "Performance ratio",
      value: `${Math.round(eng.performanceRatio * 100)}%`,
    });
  }
  if (
    typeof eng.modulesPerString === "number" &&
    typeof eng.stringCount === "number"
  ) {
    tiles.push({
      label: "String configuration",
      value: `${eng.modulesPerString} × ${eng.stringCount}`,
      hint: "modules/string × strings",
    });
  } else if (typeof eng.modulesPerString === "number") {
    tiles.push({
      label: "Modules per string",
      value: String(eng.modulesPerString),
    });
  } else if (typeof eng.stringCount === "number") {
    tiles.push({ label: "String count", value: String(eng.stringCount) });
  }

  if (tiles.length === 0 && !climate) return null;

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
      {tiles.length > 0 && (
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
      )}

      {/* Climate yield model — gross irradiance minus the dust/soiling and
          high-temperature losses that matter enormously in Gulf markets. */}
      {climate && (
        <div className="mt-3 rounded-md border border-[#2A3038] bg-[#0A0E1A] p-3">
          <div className="mb-2 text-[9px] uppercase tracking-wider text-[#5B6470]">
            Yield &amp; climate losses · {climate.country}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
            <span className="text-[#9BA3AF]">
              Gross{" "}
              <span className="font-semibold text-[#F7F8FA]">
                {Math.round(climate.grossKwhPerKwp).toLocaleString()}
              </span>{" "}
              kWh/kWp
            </span>
            <span className="text-[#F2B84B]">
              − soiling {Math.round(climate.soilingLossPct * 100)}%
            </span>
            <span className="text-[#F2B84B]">
              − temperature {Math.round(climate.temperatureLossPct * 100)}%
            </span>
            <span className="text-[#62E6A7]">
              = net{" "}
              <span className="font-semibold">
                {Math.round(climate.netSpecificYieldKwhPerKwp).toLocaleString()}
              </span>{" "}
              kWh/kWp
            </span>
          </div>
        </div>
      )}

      {tiles.length > 0 && (
        <p className="mt-3 text-[11px] leading-snug text-[#5B6470]">
          AI-computed array geometry for this roof — orientation and tilt, plus (where
          the sizer emits them) spacing and string layout a certified installer can build to.
        </p>
      )}
    </section>
  );
}
