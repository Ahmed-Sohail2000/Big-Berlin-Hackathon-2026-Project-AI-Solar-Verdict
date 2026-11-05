import { useLanguage } from "@/components/layout/LanguageProvider";
import { StepPanel } from "../ui/fields";
import { ObstructionEditor } from "./ObstructionEditor";
import type { Workspace } from "../state/useWorkspace";
import { NextButton } from "./NextButton";

export function ObstructionsStep({ workspace }: { workspace: Workspace }) {
  const { t } = useLanguage();
  return (
    <StepPanel title={t.obstructions.title} hint={t.obstructions.hint}>
      <ObstructionEditor
        obstructions={workspace.obstructions}
        rows={workspace.rowCount}
        columns={workspace.columnCount}
        onChange={workspace.setObstructions}
        onDetect={workspace.detectObstructions}
        drawing={workspace.drawingArea}
        onDrawingChange={workspace.setDrawingArea}
      />
      <NextButton label={t.obstructions.next} onClick={() => workspace.setStep("panels")} />
    </StepPanel>
  );
}
