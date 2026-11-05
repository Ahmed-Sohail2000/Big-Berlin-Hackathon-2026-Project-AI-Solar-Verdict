"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import type { PanelMode } from "@/lib/tile-count/planning/panel-plan";
import { PANEL_PRESETS, type PanelOrientation } from "@/lib/tile-count/planning/panels";
import type { Workspace } from "../state/useWorkspace";
import type { PanelPlanState } from "../state/usePanelPlan";
import { BUTTON_CLASS, Field, INPUT_CLASS, NumberField, StepPanel } from "../ui/fields";
import { NextButton } from "./NextButton";

const MODES: PanelMode[] = ["none", "auto", "manual"];
const ORIENTATIONS: PanelOrientation[] = ["portrait", "landscape"];

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
  const { t, msg } = useLanguage();
  const { panel, layout, setPanel, setLayout, presetName, panelErrors } = planner;
  return (
    <>
      <Field label={t.panels.type}>
        <select
          className={INPUT_CLASS}
          value={presetName}
          onChange={(event) => planner.choosePreset(event.target.value)}
        >
          {PANEL_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {msg(preset.name)}
            </option>
          ))}
          {presetName === "Custom panel" && <option value="Custom panel">{msg("Custom panel")}</option>}
        </select>
      </Field>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <NumberField label={t.panels.length} value={panel.lengthMm} onChange={(lengthMm) => setPanel({ lengthMm })} />
        <NumberField label={t.panels.width} value={panel.widthMm} onChange={(widthMm) => setPanel({ widthMm })} />
        <NumberField label={t.panels.power} value={panel.wattsPeak} onChange={(wattsPeak) => setPanel({ wattsPeak })} />
        <NumberField
          label={t.panels.edge}
          value={layout.edgeSetbackMm}
          onChange={(edgeSetbackMm) => setLayout({ edgeSetbackMm })}
        />
        <NumberField label={t.panels.gap} value={layout.panelGapMm} onChange={(panelGapMm) => setLayout({ panelGapMm })} />
        <NumberField
          label={t.panels.clearance}
          value={layout.obstructionClearanceMm}
          onChange={(obstructionClearanceMm) => setLayout({ obstructionClearanceMm })}
        />
      </div>
      <p className="mt-2 text-xs text-muted">{t.panels.unitHint}</p>
      {panelErrors[0] && <p className="mt-2 text-xs text-warning">{msg(panelErrors[0])}</p>}
    </>
  );
}

function ManualControls({ planner }: { planner: PanelPlanState }) {
  const { t, msg } = useLanguage();
  const [fromBottom, setFromBottom] = useState("");
  const [fromLeft, setFromLeft] = useState("");
  const { manualPanels, panelDescriptions, invalidIds, placementError } = planner;

  return (
    <div className="mt-4 space-y-3">
      <div>
        <span className="mb-1 block text-xs text-muted">{t.panels.nextPanel}</span>
        <div className="grid grid-cols-2 gap-2">
          {ORIENTATIONS.map((value) => (
            <SegmentButton
              key={value}
              label={t.panels[value]}
              on={planner.orientation === value}
              onClick={() => planner.setOrientation(value)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <NumberField label={t.panels.fromBottom} value={fromBottom} onChange={setFromBottom} />
        <NumberField label={t.panels.fromLeft} value={fromLeft} onChange={setFromLeft} />
        <button
          type="button"
          className={BUTTON_CLASS}
          disabled={fromBottom === "" || fromLeft === ""}
          onClick={() => planner.addAt(Number(fromBottom), Number(fromLeft))}
        >
          {t.panels.add}
        </button>
      </div>

      {placementError && (
        <p role="alert" className="text-xs text-warning">
          {msg(placementError)}
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
                    {index + 1}. {msg(panelDescriptions[index])}
                    {invalid ? t.panels.noLongerFits : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={t.panels.removeOne(index + 1)}
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
            {t.panels.removeAll}
          </button>
        </>
      )}
    </div>
  );
}

export function PanelsStep({ workspace }: { workspace: Workspace }) {
  const { t, msg, number } = useLanguage();
  const { dimensions, planner, panelProblem } = workspace;
  const { mode, plan, recommendation } = planner;

  return (
    <StepPanel title={t.panels.title} hint={t.panels.hint}>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t.panels.group}>
        {MODES.map((value) => (
          <SegmentButton
            key={value}
            label={t.panels.modes[value].label}
            on={mode === value}
            onClick={() => planner.setMode(value)}
          />
        ))}
      </div>
      <p className="mt-3 mb-4 text-sm text-muted">{t.panels.modes[mode].hint}</p>

      {panelProblem && (
        <div className="mb-4 space-y-2 rounded-md border border-warning p-3">
          <p className="text-sm text-warning">{msg(panelProblem.message)}</p>
          <button type="button" className={BUTTON_CLASS} onClick={() => workspace.setStep(panelProblem.step)}>
            {t.panels.goTo(t.steps[panelProblem.step])}
          </button>
        </div>
      )}
      {mode !== "none" && <PanelSettings planner={planner} />}

      {plan && (
        <div className="mt-4 rounded-md bg-surface-raised p-3">
          <p className="font-mono text-lg font-semibold tabular-nums">
            {t.panels.summary(plan.count, number(plan.systemKwp, 2))}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t.panels.coverage(number(plan.coveragePct))}
            {mode === "auto" &&
              recommendation &&
              ` ${t.panels.alternative(
                t.panels[recommendation.orientation],
                t.panels[recommendation.alternative.orientation],
                recommendation.alternative.count,
              )}`}
          </p>
        </div>
      )}

      {mode === "auto" && recommendation && (
        <button type="button" className={`${BUTTON_CLASS} mt-3 w-full`} onClick={planner.editAutomaticLayout}>
          <Pencil className="h-4 w-4" aria-hidden />
          {t.panels.editByHand}
        </button>
      )}
      {mode === "manual" && dimensions && <ManualControls planner={planner} />}

      <NextButton label={t.panels.next} onClick={() => workspace.setStep("export")} />
    </StepPanel>
  );
}
