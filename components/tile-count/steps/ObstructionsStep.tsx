import { StepPanel } from "../ui/fields";
import { ObstructionEditor } from "./ObstructionEditor";
import type { Workspace } from "../state/useWorkspace";
import { NextButton } from "./NextButton";

export function ObstructionsStep({ workspace }: { workspace: Workspace }) {
  return (
    <StepPanel
      title="Mark obstruction areas"
      hint="Roof windows, chimneys, pipes, dormers and dishes, in whole tiles. Let the app detect them, draw them on the photo, or type them. Detected areas are dashed until you accept them, and you choose the type."
    >
      <ObstructionEditor
        obstructions={workspace.obstructions}
        rows={workspace.rowCount}
        columns={workspace.columnCount}
        onChange={workspace.setObstructions}
        onDetect={workspace.detectObstructions}
        drawing={workspace.drawingArea}
        onDrawingChange={workspace.setDrawingArea}
      />
      <NextButton label="Plan panels" onClick={() => workspace.setStep("panels")} />
    </StepPanel>
  );
}
