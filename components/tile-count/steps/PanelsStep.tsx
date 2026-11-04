import { PANEL_PRESETS } from "@/lib/tile-count/panels";
import { Field, INPUT_CLASS, NumberField, StepPanel } from "../fields";
import type { Workspace } from "../useWorkspace";
import { NextButton } from "./NextButton";

export function PanelsStep({ workspace }: { workspace: Workspace }) {
  const { panel, layout, setPanel, setLayout, presetName, recommendation, panelErrors, dimensions } = workspace;

  return (
    <StepPanel
      title="Recommended panels"
      hint="How many panels fit on the measured roof, around the obstruction areas. This is a planning proposal: check it against the CAD drawing, local setback rules and the structure."
    >
      <Field label="Panel type">
        <select
          className={INPUT_CLASS}
          value={presetName}
          onChange={(event) => workspace.choosePreset(event.target.value)}
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
      {!dimensions && <p className="mt-3 text-xs text-warning">Enter the tile counts and tile size first.</p>}
      {recommendation && (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <p className="text-lg font-semibold tabular-nums">
            {recommendation.count} panels, {recommendation.systemKwp.toFixed(2)} kWp
          </p>
          <p className="mt-1 text-xs text-muted">
            {recommendation.orientation === "portrait" ? "Portrait" : "Landscape"} layout covering{" "}
            {recommendation.coveragePct}% of the surface.{" "}
            {recommendation.alternative.orientation === "portrait" ? "Portrait" : "Landscape"} fits{" "}
            {recommendation.alternative.count}.
          </p>
        </div>
      )}
      <NextButton label="Confirm and export" onClick={() => workspace.setStep("export")} />
    </StepPanel>
  );
}
