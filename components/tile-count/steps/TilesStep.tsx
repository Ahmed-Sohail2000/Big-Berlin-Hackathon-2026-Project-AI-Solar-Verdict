"use client";

import { useState } from "react";
import { NumberField, StepPanel } from "../fields";
import { RulerCalibration } from "../RulerCalibration";
import type { Workspace } from "../useWorkspace";
import { NextButton } from "./NextButton";

export function TilesStep({ workspace }: { workspace: Workspace }) {
  const { tile, setTile, tileErrors, setStep, dimensions } = workspace;
  const [showRuler, setShowRuler] = useState(false);

  return (
    <StepPanel
      title="Enter the tile size"
      hint="Required, in millimetres. Tile counts become metres through the exposed height and cover width."
    >
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Tile height" value={tile.height} onChange={(height) => setTile({ height })} />
        <NumberField label="Tile width" value={tile.width} onChange={(width) => setTile({ width })} />
        <NumberField
          label="Overlap"
          value={tile.headLap}
          onChange={(headLap) => setTile({ headLap })}
          disabled={tile.spacing !== ""}
        />
        <NumberField label="Side overlap" value={tile.sideLap} onChange={(sideLap) => setTile({ sideLap })} />
        <NumberField label="Row spacing (optional)" value={tile.spacing} onChange={(spacing) => setTile({ spacing })} />
      </div>
      {tile.height !== "" && tile.width !== "" && tileErrors.length > 0 && (
        <p className="mt-2 text-xs text-warning">{tileErrors[0]}</p>
      )}
      {dimensions && (
        <p className="mt-3 text-xs text-muted">
          Exposed height {dimensions.exposedHeightMm} mm, cover width {dimensions.coverWidthMm} mm. Roof area{" "}
          {dimensions.areaM2.toFixed(2)} m².
        </p>
      )}
      <button
        type="button"
        className="mt-3 text-xs text-accent underline"
        onClick={() => setShowRuler((shown) => !shown)}
      >
        {showRuler ? "Hide reference photo" : "Measure from a reference photo"}
      </button>
      {showRuler && (
        <div className="mt-3">
          <RulerCalibration onMeasured={(height, width) => setTile({ height: String(height), width: String(width) })} />
        </div>
      )}
      <NextButton label="Mark obstructions" onClick={() => setStep("obstructions")} />
    </StepPanel>
  );
}
