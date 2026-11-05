import { ArrowRight, Download } from "lucide-react";
import { BUTTON_CLASS, Field, INPUT_CLASS, PRIMARY_BUTTON_CLASS, StepPanel } from "../ui/fields";
import type { ExportFormat, Workspace } from "../state/useWorkspace";

const FORMATS: ExportFormat[] = ["pdf", "png", "dxf", "csv", "json"];

export function ExportStep({ workspace }: { workspace: Workspace }) {
  const { blocker, confirmed, nextQueued, photo, quad } = workspace;
  return (
    <StepPanel
      title="Confirm and export"
      hint="Export unlocks once you confirm that the count matches the photo. Any later change needs a new confirmation."
    >
      <div className="space-y-3">
        <Field label="Customer case reference">
          <input
            className={INPUT_CLASS}
            maxLength={80}
            value={workspace.caseReference}
            onChange={(event) => workspace.setCaseReference(event.target.value)}
          />
        </Field>
        <Field label="Roof surface">
          <input
            className={INPUT_CLASS}
            maxLength={80}
            value={workspace.roofSurface}
            onChange={(event) => workspace.setRoofSurface(event.target.value)}
          />
        </Field>
        {blocker && <p className="text-xs text-warning">{blocker}</p>}
        <button
          type="button"
          className={`${PRIMARY_BUTTON_CLASS} w-full`}
          disabled={!photo || !quad || Boolean(blocker) || confirmed}
          onClick={workspace.confirm}
        >
          {confirmed ? "Confirmed" : "Confirm result"}
        </button>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className={BUTTON_CLASS}
              disabled={!confirmed}
              onClick={() => void workspace.exportAs(format)}
            >
              <Download className="h-4 w-4" aria-hidden />
              {format.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          DXF is a true-scale drawing in millimetres for the CAD program. PDF and PNG show the annotated photo.
        </p>
        {nextQueued && (
          <button
            type="button"
            className={`${BUTTON_CLASS} w-full`}
            disabled={!confirmed}
            onClick={() => workspace.openQueued(nextQueued.index)}
          >
            Next photo in this folder
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </StepPanel>
  );
}
