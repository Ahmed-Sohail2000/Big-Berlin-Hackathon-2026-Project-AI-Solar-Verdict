import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import type { ConfidenceLevel } from "@/lib/tile-count/types";
import { NumberField, StepPanel } from "../ui/fields";
import type { Workspace } from "../state/useWorkspace";
import { NextButton } from "./NextButton";

const LEVEL_STYLE: Record<ConfidenceLevel, string> = {
  high: "border-success text-success",
  medium: "border-warning text-warning",
  low: "border-warning text-warning",
};

export function RoofStep({ workspace }: { workspace: Workspace }) {
  const { t, msg } = useLanguage();
  const { photo, result, rows, columns, setRows, setColumns, setStep } = workspace;
  const estimate =
    result?.level === "low" && result.rows.count !== null && result.columns.count !== null
      ? t.roof.unreliable(result.rows.count, result.columns.count)
      : null;

  return (
    <StepPanel title={t.roof.title} hint={t.roof.hint}>
      {result && (
        <p className={`mb-3 inline-block rounded-md border px-2 py-1 text-xs font-medium ${LEVEL_STYLE[result.level]}`}>
          {t.roof.levels[result.level]}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t.roof.tilesHigh} hint={t.roof.tilesHighHint} value={rows} onChange={setRows} />
        <NumberField label={t.roof.tilesWide} hint={t.roof.tilesWideHint} value={columns} onChange={setColumns} />
      </div>
      <p className="mt-2 text-xs text-muted">{t.roof.gridNote}</p>
      {estimate && <p className="mt-3 text-xs text-warning">{estimate}</p>}
      {[...(photo?.warnings ?? []), ...(result?.warnings ?? [])].map((warning) => (
        <p key={warning} className="mt-2 flex gap-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {msg(warning)}
        </p>
      ))}
      <NextButton label={t.roof.next} onClick={() => setStep("tiles")} />
    </StepPanel>
  );
}
