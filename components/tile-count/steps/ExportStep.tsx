import { ArrowRight, Download } from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { BUTTON_CLASS, Field, INPUT_CLASS, PRIMARY_BUTTON_CLASS, StepPanel } from "../ui/fields";
import type { ExportFormat, Workspace } from "../state/useWorkspace";

const FORMATS: ExportFormat[] = ["pdf", "png", "dxf", "csv", "json"];

export function ExportStep({ workspace }: { workspace: Workspace }) {
  const { language, t, msg } = useLanguage();
  const { blocker, confirmed, nextQueued, photo, quad } = workspace;
  return (
    <StepPanel title={t.export.title} hint={t.export.hint}>
      <div className="space-y-3">
        <Field label={t.export.caseReference}>
          <input
            className={INPUT_CLASS}
            maxLength={80}
            value={workspace.caseReference}
            onChange={(event) => workspace.setCaseReference(event.target.value)}
          />
        </Field>
        <Field label={t.export.surface}>
          <input
            className={INPUT_CLASS}
            maxLength={80}
            value={workspace.roofSurface}
            onChange={(event) => workspace.setRoofSurface(event.target.value)}
          />
        </Field>
        {blocker && <p className="text-xs text-warning">{msg(blocker)}</p>}
        <button
          type="button"
          className={`${PRIMARY_BUTTON_CLASS} w-full`}
          disabled={!photo || !quad || Boolean(blocker) || confirmed}
          onClick={workspace.confirm}
        >
          {confirmed ? t.export.confirmed : t.export.confirm}
        </button>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className={BUTTON_CLASS}
              disabled={!confirmed}
              onClick={() => void workspace.exportAs(format, language)}
            >
              <Download className="h-4 w-4" aria-hidden />
              {format.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t.export.note}</p>
        {nextQueued && (
          <button
            type="button"
            className={`${BUTTON_CLASS} w-full`}
            disabled={!confirmed}
            onClick={() => workspace.openQueued(nextQueued.index)}
          >
            {t.export.nextPhoto}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </StepPanel>
  );
}
