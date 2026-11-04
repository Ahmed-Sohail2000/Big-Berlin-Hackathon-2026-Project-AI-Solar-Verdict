import { StepPanel } from "../fields";
import { ObstructionEditor } from "../ObstructionEditor";
import type { Workspace } from "../useWorkspace";
import { NextButton } from "./NextButton";

export function ObstructionsStep({ workspace }: { workspace: Workspace }) {
  return (
    <StepPanel
      title="Mark obstruction areas"
      hint="Roof windows, chimneys, pipes, dormers and dishes, in whole tiles. Detected areas are dashed until you accept them, and you choose the type."
    >
      <ObstructionEditor
        obstructions={workspace.obstructions}
        rows={workspace.rowCount}
        columns={workspace.columnCount}
        onChange={workspace.setObstructions}
        onDetect={workspace.detectObstructions}
      />
      <NextButton label="Recommend panels" onClick={() => workspace.setStep("panels")} />
    </StepPanel>
  );
}
