"use client";

import { Check, PenLine, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/layout/LanguageProvider";
import { describeObstruction, validateObstruction } from "@/lib/tile-count/vision/obstructions";
import type { Obstruction, ObstructionKind } from "@/lib/tile-count/types";
import { nextObstructionId } from "../state/useWorkspace";
import { BUTTON_CLASS, INPUT_CLASS } from "../ui/fields";

const KINDS: ObstructionKind[] = ["roof_window", "chimney", "exhaust_pipe", "dormer", "satellite_dish", "other"];

const NUMBER_FIELDS = [
  { key: "fromBottom", label: "fromBottom" },
  { key: "fromLeft", label: "fromLeft" },
  { key: "widthTiles", label: "wide" },
  { key: "heightTiles", label: "high" },
] as const;

interface Props {
  obstructions: Obstruction[];
  rows: number | null;
  columns: number | null;
  onChange: (obstructions: Obstruction[]) => void;
  onDetect: () => void;
  drawing: boolean;
  onDrawingChange: (drawing: boolean) => void;
}

/** Table of obstruction areas in tile positions. Proposals stay dashed until accepted. */
export function ObstructionEditor({ obstructions, rows, columns, onChange, onDetect, drawing, onDrawingChange }: Props) {
  const { t, msg } = useLanguage();
  const ready = rows !== null && columns !== null;

  function update(id: string, patch: Partial<Obstruction>) {
    onChange(obstructions.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function add() {
    onChange([
      ...obstructions,
      { id: nextObstructionId(obstructions), kind: "roof_window", fromBottom: 0, fromLeft: 0, widthTiles: 1, heightTiles: 1, proposed: false },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON_CLASS} disabled={!ready} onClick={onDetect}>
          {t.obstructions.detect}
        </button>
        <button
          type="button"
          aria-pressed={drawing}
          className={`${BUTTON_CLASS} ${drawing ? "border-accent text-accent" : ""}`}
          disabled={!ready}
          onClick={() => onDrawingChange(!drawing)}
        >
          <PenLine className="h-4 w-4" aria-hidden />
          {t.obstructions.draw}
        </button>
        <button type="button" className={BUTTON_CLASS} disabled={!ready} onClick={add}>
          <Plus className="h-4 w-4" aria-hidden />
          {t.obstructions.add}
        </button>
      </div>
      {drawing && <p className="text-xs text-accent">{t.obstructions.drawHint}</p>}
      {obstructions.map((o) => {
        const problem = ready ? validateObstruction(o, rows, columns) : null;
        return (
          <div key={o.id} className="space-y-2 rounded-md border border-border p-2.5">
            <div className="flex items-center gap-2">
              <select
                aria-label={t.obstructions.type}
                className={INPUT_CLASS}
                value={o.kind}
                onChange={(event) => update(o.id, { kind: event.target.value as ObstructionKind })}
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t.obstructions.kinds[kind]}
                  </option>
                ))}
              </select>
              {o.proposed && (
                <button
                  type="button"
                  aria-label={t.obstructions.accept}
                  className="shrink-0 rounded-md border border-success/40 p-1.5 text-success"
                  onClick={() => update(o.id, { proposed: false })}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                aria-label={t.obstructions.remove}
                className="shrink-0 rounded-md border border-border p-1.5 text-muted hover:text-foreground"
                onClick={() => onChange(obstructions.filter((other) => other.id !== o.id))}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {NUMBER_FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-muted">{t.obstructions[label]}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={INPUT_CLASS}
                    value={Number.isNaN(o[key]) ? "" : o[key]}
                    onChange={(event) => update(o.id, { [key]: event.target.valueAsNumber })}
                  />
                </label>
              ))}
            </div>
            <p className={`text-xs ${problem ? "text-warning" : "text-muted"}`}>
              {msg(problem ?? describeObstruction(o))}
              {o.proposed && !problem ? t.obstructions.proposed : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
