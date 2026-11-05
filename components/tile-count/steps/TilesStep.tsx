"use client";

import { useState } from "react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { NumberField, StepPanel } from "../ui/fields";
import { RulerCalibration } from "./RulerCalibration";
import type { Workspace } from "../state/useWorkspace";
import { NextButton } from "./NextButton";

export function TilesStep({ workspace }: { workspace: Workspace }) {
  const { t, msg, number } = useLanguage();
  const { tile, setTile, tileErrors, tileWarnings, setStep, dimensions } = workspace;
  const [showRuler, setShowRuler] = useState(false);

  return (
    <StepPanel title={t.tiles.title} hint={t.tiles.hint}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t.tiles.height} value={tile.height} onChange={(height) => setTile({ height })} />
        <NumberField label={t.tiles.width} value={tile.width} onChange={(width) => setTile({ width })} />
        <NumberField
          label={t.tiles.overlap}
          value={tile.headLap}
          onChange={(headLap) => setTile({ headLap })}
          disabled={tile.spacing !== ""}
        />
        <NumberField label={t.tiles.sideOverlap} value={tile.sideLap} onChange={(sideLap) => setTile({ sideLap })} />
        <NumberField label={t.tiles.spacing} value={tile.spacing} onChange={(spacing) => setTile({ spacing })} />
      </div>
      {tile.height !== "" && tile.width !== "" && tileErrors.length > 0 && (
        <p className="mt-2 text-xs text-warning">{msg(tileErrors[0])}</p>
      )}
      {tileWarnings.map((warning) => (
        <p key={warning} className="mt-2 text-xs text-warning">
          {msg(warning)}
        </p>
      ))}
      {dimensions && (
        <p className="mt-3 text-xs text-muted">
          {t.tiles.result(
            number(dimensions.exposedHeightMm),
            number(dimensions.coverWidthMm),
            number(dimensions.areaM2, 2),
          )}
        </p>
      )}
      <button
        type="button"
        className="mt-3 text-xs text-accent underline"
        onClick={() => setShowRuler((shown) => !shown)}
      >
        {showRuler ? t.tiles.hideRuler : t.tiles.showRuler}
      </button>
      {showRuler && (
        <div className="mt-3">
          <RulerCalibration onMeasured={(height, width) => setTile({ height: String(height), width: String(width) })} />
        </div>
      )}
      <NextButton label={t.tiles.next} onClick={() => setStep("obstructions")} />
    </StepPanel>
  );
}
