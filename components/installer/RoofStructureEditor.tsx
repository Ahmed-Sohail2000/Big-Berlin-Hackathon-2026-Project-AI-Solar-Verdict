"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import type { Intake, RoofSegment } from "@/lib/contracts";
import type { LeadRecord } from "@/lib/leads/store";
import { sizeQuote } from "@/lib/sizing/calculate";
import { composeFromMarket } from "@/lib/sizing/compose-from-market";
import { SyntheticRoof3D } from "@/components/homeowner/SyntheticRoof3D";

/**
 * Manual roof-structure editor -- a parameter form (NOT a drag/gizmo editor).
 * Lets the installer correct the AI-measured segments (pitch, orientation,
 * area) when the satellite read looks off, re-runs the same deterministic
 * sizer InstallerLeadDetail uses, and shows the result in a live 3D preview
 * before writing it back to the lead via PATCH .../sync-preview.
 */

interface Props {
  lead: LeadRecord;
  intake: Intake;
  /** Seed segments -- liveSegments when the live roof-facts fetch has loaded,
   *  else a single segment derived from the stored roofFacts snapshot. */
  initialSegments: RoofSegment[];
  onLeadChange: (lead: LeadRecord) => void;
}

interface RecomputedSizing {
  panelCount: number;
  systemKwp: number;
  tiltDegrees?: number;
  rowSpacingMeters?: number;
}

function recomputeSizing(
  intake: Intake,
  segments: RoofSegment[],
): RecomputedSizing | null {
  if (segments.length === 0) return null;
  let sizing: ReturnType<typeof sizeQuote> | null = null;
  try {
    const market = composeFromMarket({ intake, roofSegments: segments });
    if (market) sizing = market;
  } catch {
    // fall through to sizeQuote
  }
  if (!sizing) {
    try {
      sizing = sizeQuote(intake, segments);
    } catch {
      return null;
    }
  }
  if (!sizing) return null;
  return {
    panelCount: sizing.panelCount,
    systemKwp: sizing.systemKwp,
    tiltDegrees: sizing.engineering?.tiltDegrees,
    rowSpacingMeters: sizing.engineering?.rowSpacingMeters,
  };
}

function clampNumber(value: string, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

let nextSegmentKey = 0;

export function RoofStructureEditor({ lead, intake, initialSegments, onLeadChange }: Props) {
  const [rows, setRows] = useState<Array<RoofSegment & { key: number }>>(() =>
    initialSegments.map((s) => ({ ...s, key: nextSegmentKey++ })),
  );
  const [applyBusy, setApplyBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const segments: RoofSegment[] = useMemo(
    () =>
      rows.map((r) => ({
        pitchDegrees: r.pitchDegrees,
        azimuthDegrees: r.azimuthDegrees,
        areaMeters2: r.areaMeters2,
        annualSunshineHours: r.annualSunshineHours,
      })),
    [rows],
  );

  const computed = useMemo(() => recomputeSizing(intake, segments), [intake, segments]);

  const totalAreaM2 = useMemo(
    () => Math.round(segments.reduce((sum, s) => sum + (s.areaMeters2 || 0), 0) * 10) / 10,
    [segments],
  );

  const updateRow = (key: number, patch: Partial<RoofSegment>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        key: nextSegmentKey++,
        pitchDegrees: last?.pitchDegrees ?? 20,
        azimuthDegrees: last?.azimuthDegrees ?? 180,
        areaMeters2: last?.areaMeters2 ?? 20,
        annualSunshineHours: last?.annualSunshineHours ?? 1200,
      },
    ]);
  };

  const removeRow = (key: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const applyStructure = async () => {
    if (!computed || segments.length === 0) {
      setNotice("Add at least one valid segment first.");
      return;
    }
    setApplyBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-preview",
          roofFacts: {
            totalAreaM2,
            pitchDeg: Math.round(segments[0]?.pitchDegrees ?? 0),
            azimuth: Math.round(segments[0]?.azimuthDegrees ?? 0),
            segmentsCount: segments.length,
          },
          panelCount: computed.panelCount,
          roofSegments: segments,
        }),
      });
      const data = (await res.json().catch(() => null)) as { lead?: LeadRecord } | null;
      if (!res.ok || !data?.lead) {
        setNotice("Apply failed -- try again.");
        return;
      }
      onLeadChange(data.lead);
      setNotice("Applied to lead.");
    } catch {
      setNotice("Apply failed -- try again.");
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <details className="group rounded-lg border border-[#2A3038] bg-[#12161C]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-xs font-semibold uppercase tracking-wider text-[#9BA3AF] [&::-webkit-details-marker]:hidden">
        Roof structure editor
        <span className="text-[10px] normal-case tracking-normal text-[#5B6470]">
          {rows.length} segment{rows.length === 1 ? "" : "s"} · {totalAreaM2} m²
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-[#2A3038] p-4">
        <p className="text-[11px] leading-snug text-[#5B6470]">
          Adjust pitch, orientation, or area if the AI-measured roof looks off -- the 3D
          preview and system size update live; Apply saves it to this lead.
        </p>

        {/* Live 3D preview -- offline procedural view, independent of the main
            dashboard's Cesium/synthetic toggle, so the installer can watch the
            array respond to edits without leaving this card. */}
        <div className="relative h-56 overflow-hidden rounded-md border border-[#2A3038] bg-[#0A0E1A]">
          <SyntheticRoof3D
            address={lead.publicPreview.district}
            totalAreaM2={totalAreaM2}
            panelCount={computed?.panelCount}
            tiltDegrees={computed?.tiltDegrees}
            rowSpacingMeters={computed?.rowSpacingMeters}
            variant="residential"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-[#2A3038] bg-[#0A0E1A] px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-wider text-[#5B6470]">System size</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#F7F8FA]">
              {computed ? `${computed.systemKwp} kWp` : "—"}
            </div>
            <div className="mt-1 text-[9px] leading-snug text-[#5B6470]">
              Total generating capacity if this structure is applied.
            </div>
          </div>
          <div className="rounded-md border border-[#2A3038] bg-[#0A0E1A] px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-wider text-[#5B6470]">Panels</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#F7F8FA]">
              {computed ? computed.panelCount : "—"}
            </div>
            <div className="mt-1 text-[9px] leading-snug text-[#5B6470]">
              How many panels fit across the edited segments.
            </div>
          </div>
          <div className="rounded-md border border-[#2A3038] bg-[#0A0E1A] px-2.5 py-2">
            <div className="text-[9px] uppercase tracking-wider text-[#5B6470]">Total roof area</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-[#F7F8FA]">
              {totalAreaM2} m²
            </div>
            <div className="mt-1 text-[9px] leading-snug text-[#5B6470]">
              Sum of the area entered for every segment below.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((row, idx) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-[#2A3038] bg-[#0A0E1A] p-2.5"
            >
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[#5B6470]">
                  Segment {idx + 1} · Pitch (°)
                </span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={row.pitchDegrees}
                  onChange={(e) =>
                    updateRow(row.key, {
                      pitchDegrees: clampNumber(e.target.value, 0, 90, row.pitchDegrees),
                    })
                  }
                  className="rounded-md border border-[#2A3038] bg-[#12161C] px-2 py-1 text-sm tabular-nums text-[#F7F8FA] focus:border-[#3DAEFF] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[#5B6470]">
                  Azimuth (°)
                </span>
                <input
                  type="number"
                  min={0}
                  max={359}
                  value={row.azimuthDegrees}
                  onChange={(e) =>
                    updateRow(row.key, {
                      azimuthDegrees: clampNumber(e.target.value, 0, 359, row.azimuthDegrees),
                    })
                  }
                  className="rounded-md border border-[#2A3038] bg-[#12161C] px-2 py-1 text-sm tabular-nums text-[#F7F8FA] focus:border-[#3DAEFF] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[#5B6470]">
                  Area (m²)
                </span>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={row.areaMeters2}
                  onChange={(e) =>
                    updateRow(row.key, {
                      areaMeters2: clampNumber(e.target.value, 1, 2000, row.areaMeters2),
                    })
                  }
                  className="rounded-md border border-[#2A3038] bg-[#12161C] px-2 py-1 text-sm tabular-nums text-[#F7F8FA] focus:border-[#3DAEFF] focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                disabled={rows.length <= 1}
                aria-label={`Remove segment ${idx + 1}`}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#2A3038] bg-[#12161C] text-[#9BA3AF] transition-colors hover:border-[#F2B84B]/50 hover:text-[#F2B84B] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 rounded-md border border-[#2A3038] bg-[#0A0E1A] px-2.5 py-1.5 text-[11px] font-medium text-[#9BA3AF] transition-colors hover:border-[#3DAEFF]/50 hover:text-[#F7F8FA]"
          >
            <Plus size={12} />
            Add segment
          </button>

          <div className="flex items-center gap-2">
            {notice ? (
              <span
                className={`text-[11px] ${
                  notice === "Applied to lead." ? "text-[#62E6A7]" : "text-[#F2B84B]"
                }`}
              >
                {notice}
              </span>
            ) : null}
            <button
              type="button"
              onClick={applyStructure}
              disabled={applyBusy || !computed}
              className="flex items-center gap-1.5 rounded-md bg-[#3DAEFF] px-3 py-1.5 text-[11px] font-semibold text-[#0A0E1A] transition-colors hover:bg-[#2EA1F0] disabled:cursor-wait disabled:opacity-60"
            >
              {applyBusy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Apply structure
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}

export default RoofStructureEditor;
