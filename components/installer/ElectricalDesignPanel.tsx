"use client";

import type { Intake, SizingResult } from "@/lib/contracts";
import {
  computeResidentialStringSizing,
  recommendWireGaugeMm2,
} from "@/lib/sizing/electrical";

/**
 * Small "Electrical design" sub-section that sits below EngineeringPanel.
 *
 * Display-only — never mutates `sizing` or feeds anything back into a
 * persisted lead/API payload. For residential/pitched results (no
 * `sizing.engineering.modulesPerString`/`stringCount`), it runs the
 * client-side string-sizing + wire-gauge calculators from
 * lib/sizing/electrical.ts and renders their output. For commercial/flat
 * results the sizer already emits string data via `sizing.engineering`, so
 * this panel only adds the wire-gauge/voltage-drop estimate.
 */

interface Props {
  /** Sizer output already loaded by the caller — same object EngineeringPanel
   *  reads its `engineering` block from. */
  sizing: SizingResult;
  /** Homeowner/lead intake already available to the caller. */
  intake: Intake;
}

interface Tile {
  label: string;
  value: string;
  hint?: string;
  /** One-sentence plain-language explanation of what this metric means in
   *  practical terms — distinct from `hint`. */
  caption?: string;
}

function fmt(n: number, digits = 1): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

/** Placeholder one-way DC home-run length until as-built distances exist. */
const PLACEHOLDER_RUN_LENGTH_M = 15;

export function ElectricalDesignPanel({ sizing, intake }: Props) {
  const eng = sizing.engineering;
  const hasCommercialStringData =
    typeof eng?.modulesPerString === "number" && typeof eng?.stringCount === "number";

  const residential = hasCommercialStringData
    ? null
    : computeResidentialStringSizing(sizing, intake);

  // Approximate DC-side operating voltage for the wire-gauge estimate: the
  // residential string's cold Voc when we just computed one, otherwise a
  // conventional commercial string-inverter DC bus voltage.
  const approxSystemVoltageV = residential?.stringVocCold ?? 600;
  const approxCurrentA =
    approxSystemVoltageV > 0
      ? Math.round(((sizing.systemKwp * 1000) / approxSystemVoltageV) * 10) / 10
      : 0;

  const wireGauge = recommendWireGaugeMm2({
    currentA: Math.max(approxCurrentA, 0.1),
    oneWayLengthM: PLACEHOLDER_RUN_LENGTH_M,
    systemVoltageV: approxSystemVoltageV,
  });

  const tiles: Tile[] = [];

  if (residential) {
    tiles.push({
      label: "Modules per string",
      value: String(residential.modulesPerString),
      caption: "How many panels are wired in series in each chain to the inverter.",
    });
    tiles.push({
      label: "String count",
      value: String(residential.stringCount),
      caption: "How many separate panel chains this system needs.",
    });
    tiles.push({
      label: "String Voc (cold)",
      value: `${fmt(residential.stringVocCold)} V`,
      caption: "Highest voltage a string can reach on a cold, sunny morning.",
    });
    tiles.push({
      label: "MPPT window",
      value: residential.withinMpptWindow ? "Pass" : "Out of range",
      hint: residential.withinMpptWindow
        ? "Within inverter DC window"
        : "Re-check module/inverter pairing",
      caption: "Whether that peak voltage stays inside the inverter's safe operating range.",
    });
  }

  tiles.push({
    label: "Recommended wire gauge",
    value: `${wireGauge.wireSizeMm2} mm²`,
    hint: `Est. ${PLACEHOLDER_RUN_LENGTH_M} m one-way DC run`,
    caption: "Cable thickness needed to carry the DC current safely over this run.",
  });
  tiles.push({
    label: "Voltage drop",
    value: `${fmt(wireGauge.dropPercent, 2)}%`,
    hint: "At recommended gauge",
    caption: "Energy lost to cable resistance between the panels and the inverter.",
  });

  return (
    <section className="rounded-lg border border-[#2A3038] bg-[#12161C] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9BA3AF]">
          Electrical design
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
            {tile.caption ? (
              <div className="mt-1 text-[9px] leading-snug text-[#5B6470]">{tile.caption}</div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-snug text-[#5B6470]">
        {hasCommercialStringData
          ? "String configuration from the commercial sizer above; wire gauge and voltage drop are an estimate pending as-built DC run distances."
          : "Residential single-phase string sizing computed client-side from the sizer's panel count. Wire gauge and voltage drop are an estimate pending as-built DC run distances."}
      </p>
    </section>
  );
}
