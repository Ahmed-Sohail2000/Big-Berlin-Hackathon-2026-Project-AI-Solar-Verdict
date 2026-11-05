"use client";

import { useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Check, FolderOpen, Grid3x3, ImageUp, Loader2, RotateCcw, Sparkles, SunMedium, Upload } from "lucide-react";
import { BUTTON_CLASS } from "./ui/fields";
import { RoofOverlay, type OverlayTool } from "./overlay/RoofOverlay";
import { ExportStep } from "./steps/ExportStep";
import { ObstructionsStep } from "./steps/ObstructionsStep";
import { PanelsStep } from "./steps/PanelsStep";
import { PhotoStep } from "./steps/PhotoStep";
import { RoofStep } from "./steps/RoofStep";
import { TilesStep } from "./steps/TilesStep";
import { STEPS, useWorkspace, type Workspace } from "./state/useWorkspace";

const ACCEPTED_FILES = ".jpg,.jpeg,.png,.heic,.heif,.pdf";

function Stepper({ workspace }: { workspace: Workspace }) {
  const current = STEPS.findIndex((s) => s.id === workspace.step);
  return (
    <ol className="flex flex-wrap gap-1 border-b border-border bg-surface px-5 py-2">
      {STEPS.map((step, index) => {
        const reachable = index === 0 || workspace.photo !== null;
        const done = index < current;
        return (
          <li key={step.id}>
            <button
              type="button"
              disabled={!reachable}
              aria-current={index === current ? "step" : undefined}
              onClick={() => workspace.setStep(step.id)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                index === current ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs ${
                  index === current
                    ? "border-accent text-accent"
                    : done
                      ? "border-success text-success"
                      : "border-border"
                }`}
                aria-hidden
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Dropzone({ workspace }: { workspace: Workspace }) {
  const [hovering, setHovering] = useState(false);

  function drop(event: DragEvent) {
    event.preventDefault();
    setHovering(false);
    void workspace.addDrop(event.dataTransfer);
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    void workspace.addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      onDrop={drop}
      className={`flex min-h-[28rem] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        hovering ? "border-accent bg-surface-raised" : "border-border bg-surface"
      }`}
    >
      <Upload className="h-9 w-9 text-accent" aria-hidden />
      <p className="text-lg font-semibold">Drop a roof photo or a customer folder here</p>
      <p className="max-w-md text-sm text-muted">
        JPEG, PNG, HEIC or PDF, up to 30 MB each. One photo per roof surface. Files stay on this device.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <label className={`${BUTTON_CLASS} cursor-pointer`}>
          <ImageUp className="h-4 w-4" aria-hidden />
          Choose photos
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            aria-label="Roof photo"
            className="sr-only"
            onChange={choose}
          />
        </label>
        <label className={`${BUTTON_CLASS} cursor-pointer`}>
          <FolderOpen className="h-4 w-4" aria-hidden />
          Choose folder
          <input
            type="file"
            multiple
            aria-label="Customer folder"
            className="sr-only"
            onChange={choose}
            {...{ webkitdirectory: "" }}
          />
        </label>
        <button type="button" className={BUTTON_CLASS} onClick={workspace.loadSample}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Try a sample roof
        </button>
      </div>
      {workspace.busy && <p className="text-sm text-muted">Reading the files</p>}
      {workspace.error && <p className="text-sm text-warning">{workspace.error}</p>}
    </div>
  );
}

interface ToggleProps {
  label: string;
  icon: ReactNode;
  on: boolean;
  onClick: () => void;
}

function Toggle({ label, icon, on, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
        on ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Running totals, so the employee sees the effect of every edit in any step. */
function Summary({ workspace }: { workspace: Workspace }) {
  const { rowCount, columnCount, dimensions } = workspace;
  const { plan } = workspace.planner;
  const items = [
    { label: "Tiles", value: rowCount && columnCount ? `${rowCount} × ${columnCount}` : "–" },
    {
      label: "Roof",
      value: dimensions ? `${dimensions.heightM.toFixed(2)} × ${dimensions.widthM.toFixed(2)} m` : "–",
    },
    { label: "Panels", value: plan ? String(plan.count) : "–" },
    { label: "Power", value: plan ? `${plan.systemKwp.toFixed(2)} kWp` : "–" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-4 py-3">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="font-mono text-base font-semibold whitespace-nowrap tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The mouse only places things on the photo in the step that owns them. */
function activeTool(workspace: Workspace): OverlayTool | null {
  const { step, planner, drawingArea } = workspace;
  if (step === "panels" && planner.mode === "manual") {
    return { onDown: planner.pick, onMove: planner.hoverAt, onLeave: () => planner.hoverAt(null) };
  }
  if (step === "obstructions" && drawingArea) {
    return { onDown: workspace.beginArea, onMove: workspace.extendArea, onUp: workspace.finishArea };
  }
  return null;
}

/** Guided flow: photo, roof edges, tiles, obstructions, panels, export. Runs entirely in the browser. */
export function TileCountWorkspace() {
  const workspace = useWorkspace();
  const { photo, quad, step, planner } = workspace;

  return (
    <>
      <Stepper workspace={workspace} />
      <main className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 space-y-3">
          {photo && quad ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                  label="Grid"
                  icon={<Grid3x3 className="h-4 w-4" aria-hidden />}
                  on={workspace.showGrid}
                  onClick={() => workspace.setShowGrid(!workspace.showGrid)}
                />
                {planner.mode !== "none" && (
                  <Toggle
                    label="Panels"
                    icon={<SunMedium className="h-4 w-4" aria-hidden />}
                    on={workspace.showPanels}
                    onClick={() => workspace.setShowPanels(!workspace.showPanels)}
                  />
                )}
                {photo.sample && <span className="text-sm text-warning">Sample roof, not a real photo</span>}
                {workspace.busy && (
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Counting
                  </span>
                )}
                <button type="button" className={`${BUTTON_CLASS} ml-auto`} onClick={workspace.startOver}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Start over
                </button>
              </div>
              <RoofOverlay
                photo={photo.canvas}
                quad={quad}
                grid={workspace.grid}
                obstructions={workspace.obstructionShapes}
                panels={workspace.showPanels ? planner.panelShapes : []}
                ghost={planner.ghost}
                tool={activeTool(workspace)}
                onQuadChange={(next) => {
                  workspace.setQuad(next);
                  workspace.invalidate();
                }}
                onQuadCommit={workspace.commitQuad}
              />
              <Summary workspace={workspace} />
            </>
          ) : (
            <Dropzone workspace={workspace} />
          )}
        </div>

        <div className="space-y-3">
          {step === "photo" && <PhotoStep workspace={workspace} />}
          {step === "roof" && <RoofStep workspace={workspace} />}
          {step === "tiles" && <TilesStep workspace={workspace} />}
          {step === "obstructions" && <ObstructionsStep workspace={workspace} />}
          {step === "panels" && <PanelsStep workspace={workspace} />}
          {step === "export" && <ExportStep workspace={workspace} />}
        </div>
      </main>
    </>
  );
}
