"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { PanelMode } from "@/lib/tile-count/planning/panel-plan";
import { PANEL_PRESETS, type PanelOrientation } from "@/lib/tile-count/planning/panels";
import type { Workspace } from "../state/useWorkspace";
import type { PanelPlanState } from "../state/usePanelPlan";
import { BUTTON_CLASS, Field, INPUT_CLASS, NumberField, StepPanel } from "../ui/fields";
import { NextButton } from "./NextButton";

const MODES: { value: PanelMode; label: string; hint: string }[] = [
  {
    value: "none",
    label: "Counts only",
    hint: "No panels here. Export the roof and plan the modules in the CAD drawing, as you do today.",
  },
  {
    value: "auto",
    label: "Automatic",
    hint: "The app fills the roof around the obstructions. A planning proposal to check against the CAD drawing, local setback rules and the structure.",
  },
  {
    value: "manual",
    label: "Manual",
    hint: "Click the photo to add a panel, and click a panel to remove it. Panels snap to the tile grid, so every position stays exact.",
  },
];

const ORIENTATIONS: { value: PanelOrientation; label: string }[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

function SegmentButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
        on ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function PanelSettings({ planner }: { planner: PanelPlanState }) {
  const { panel, layout, setPanel, setLayout, presetName, panelErrors } = planner;
  return (
    <>
      <Field label="Panel type">
        <select
          className={INPUT_CLASS}
          value={presetName}
          onChange={(event) => planner.choosePreset(event.target.value)}
        >
          {PANEL_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
          {presetName === "Custom panel" && <option value="Custom panel">Custom panel</option>}
        </select>
      </Field>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <NumberField label="Length (mm)" value={panel.lengthMm} onChange={(lengthMm) => setPanel({ lengthMm })} />
        <NumberField label="Width (mm)" value={panel.widthMm} onChange={(widthMm) => setPanel({ widthMm })} />
        <NumberField label="Power (W)" value={panel.wattsPeak} onChange={(wattsPeak) => setPanel({ wattsPeak })} />
        <NumberField
          label="Edge (mm)"
          value={layout.edgeSetbackMm}
          onChange={(edgeSetbackMm) => setLayout({ edgeSetbackMm })}
        />
        <NumberField label="Gap (mm)" value={layout.panelGapMm} onChange={(panelGapMm) => setLayout({ panelGapMm })} />
        <NumberField
          label="Clearance (mm)"
          value={layout.obstructionClearanceMm}
          onChange={(obstructionClearanceMm) => setLayout({ obstructionClearanceMm })}
        />
      </div>
      {panelErrors[0] && <p className="mt-2 text-xs text-warning">{panelErrors[0]}</p>}
    </>
  );
}

function ManualControls({ planner }: { planner: PanelPlanState }) {
  const [fromBottom, setFromBottom] = useState("");
  const [fromLeft, setFromLeft] = useState("");
  const { manualPanels, panelDescriptions, invalidIds, placementError } = planner;

  return (
    <div className="mt-4 space-y-3">
      <div>
        <span className="mb-1 block text-xs text-muted">Next panel</span>
        <div className="grid grid-cols-2 gap-2">
          {ORIENTATIONS.map(({ value, label }) => (
            <SegmentButton
              key={value}
              label={label}
              on={planner.orientation === value}
              onClick={() => planner.setOrientation(value)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <NumberField label="From bottom (tiles)" value={fromBottom} onChange={setFromBottom} />
        <NumberField label="From left (tiles)" value={fromLeft} onChange={setFromLeft} />
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={fromBottom === "" || fromLeft === ""}
          onClick={() => planner.addAt(Number(fromBottom), Number(fromLeft))}
        >
          Add panel
        </button>
      </div>

      {placementError && (
        <p role="alert" className="text-xs text-warning">
          {placementError}
        </p>
      )}

      {manualPanels.length > 0 && (
        <>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {manualPanels.map((panel, index) => {
              const invalid = invalidIds.includes(panel.id);
              return (
                <li
                  key={panel.id}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                    invalid ? "border-warning text-warning" : "border-border text-muted"
                  }`}
                >
                  <span className="flex-1">
                    {index + 1}. {panelDescriptions[index]}
                    {invalid ? " (no longer fits)" : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove panel ${index + 1}`}
                    className="shrink-0 hover:text-foreground"
                    onClick={() => planner.remove(panel.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className={BUTTON_CLASS} onClick={planner.clear}>
            Remove all panels
          </button>
        </>
      )}
    </div>
  );
}

export function PanelsStep({ workspace }: { workspace: Workspace }) {
  const { dimensions, planner } = workspace;
  const { mode, plan, recommendation } = planner;
  const active = MODES.find((m) => m.value === mode)!;

  return (
    <StepPanel title="Plan the panels" hint="Choose how far this tool should go. The counts stay the same in every option.">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Panel planning option">
        {MODES.map(({ value, label }) => (
          <SegmentButton key={value} label={label} on={mode === value} onClick={() => planner.setMode(value)} />
        ))}
      </div>
      <p className="mt-3 mb-4 text-sm text-muted">{active.hint}</p>

      {mode !== "none" && <PanelSettings planner={planner} />}
      {mode !== "none" && !dimensions && (
        <p className="mt-3 text-xs text-warning">Enter the tile counts and tile size first.</p>
      )}

      {plan && (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <p className="font-mono text-lg font-semibold tabular-nums">
            {plan.count} panels, {plan.systemKwp.toFixed(2)} kWp
          </p>
          <p className="mt-1 text-xs text-muted">
            Covering {plan.coveragePct}% of the surface.
            {mode === "auto" && recommendation && (
              <>
                {" "}
                {recommendation.orientation === "portrait" ? "Portrait" : "Landscape"} layout.{" "}
                {recommendation.alternative.orientation === "portrait" ? "Portrait" : "Landscape"} fits{" "}
                {recommendation.alternative.count}.
              </>
            )}
          </p>
        </div>
      )}

      {mode === "auto" && recommendation && (
        <button type="button" className={`${BUTTON_CLASS} mt-3 w-full`} onClick={planner.editAutomaticLayout}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit this layout by hand
        </button>
      )}
      {mode === "manual" && dimensions && <ManualControls planner={planner} />}

      <NextButton label="Confirm and export" onClick={() => workspace.setStep("export")} />
    </StepPanel>
  );
}
