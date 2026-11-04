import { AlertTriangle } from "lucide-react";
import type { ConfidenceLevel } from "@/lib/tile-count/types";
import { NumberField, StepPanel } from "../fields";
import type { Workspace } from "../useWorkspace";
import { NextButton } from "./NextButton";

const LEVEL_STYLE: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: "High confidence", className: "border-success text-success" },
  medium: { label: "Medium confidence, check the grid", className: "border-warning text-warning" },
  low: { label: "Not reliable", className: "border-warning text-warning" },
};

export function RoofStep({ workspace }: { workspace: Workspace }) {
  const { result, rows, columns, setRows, setColumns, setStep } = workspace;
  const level = result ? LEVEL_STYLE[result.level] : null;
  const estimate =
    result?.level === "low" && result.rows.count !== null && result.columns.count !== null
      ? `Unreliable estimate: ${result.rows.count} high, ${result.columns.count} wide. Verify the grid or count by hand.`
      : null;

  return (
    <StepPanel
      title="Check the roof edges"
      hint="Drag each corner onto the roof edge. A magnifier appears while you drag. Arrow keys move a selected corner by one pixel. The count updates when you let go."
    >
      {level && (
        <p className={`mb-3 inline-block rounded-md border px-2 py-1 text-xs font-medium ${level.className}`}>
          {level.label}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Tiles high" value={rows} onChange={setRows} />
        <NumberField label="Tiles wide" value={columns} onChange={setColumns} />
      </div>
      <p className="mt-2 text-xs text-muted">The grid must match the real tiles. If it does not, type the right count.</p>
      {estimate && <p className="mt-3 text-xs text-warning">{estimate}</p>}
      {result?.warnings.map((warning) => (
        <p key={warning} className="mt-2 flex gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {warning}
        </p>
      ))}
      <NextButton label="Enter the tile size" onClick={() => setStep("tiles")} />
    </StepPanel>
  );
}
