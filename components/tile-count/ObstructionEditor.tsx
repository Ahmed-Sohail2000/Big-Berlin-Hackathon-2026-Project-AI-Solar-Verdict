"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { describeObstruction, validateObstruction } from "@/lib/tile-count/obstructions";
import type { Obstruction, ObstructionKind } from "@/lib/tile-count/types";
import { BUTTON_CLASS, INPUT_CLASS } from "./fields";

const KINDS: { value: ObstructionKind; label: string }[] = [
  { value: "roof_window", label: "Roof window" },
  { value: "chimney", label: "Chimney" },
  { value: "exhaust_pipe", label: "Exhaust pipe" },
  { value: "dormer", label: "Dormer" },
  { value: "satellite_dish", label: "Satellite dish" },
  { value: "other", label: "Other" },
];

const NUMBER_FIELDS = [
  { key: "fromBottom", label: "From bottom" },
  { key: "fromLeft", label: "From left" },
  { key: "widthTiles", label: "Wide" },
  { key: "heightTiles", label: "High" },
] as const;

interface Props {
  obstructions: Obstruction[];
  rows: number | null;
  columns: number | null;
  onChange: (obstructions: Obstruction[]) => void;
  onDetect: () => void;
}

/** Table of obstruction areas in tile positions. Proposals stay dashed until accepted. */
export function ObstructionEditor({ obstructions, rows, columns, onChange, onDetect }: Props) {
  const ready = rows !== null && columns !== null;

  function update(id: string, patch: Partial<Obstruction>) {
    onChange(obstructions.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function add() {
    const id = `manual-${obstructions.reduce((max, o) => Math.max(max, Number(o.id.split("-")[1]) || 0), 0) + 1}`;
    onChange([
      ...obstructions,
      { id, kind: "roof_window", fromBottom: 0, fromLeft: 0, widthTiles: 1, heightTiles: 1, proposed: false },
    ]);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" className={BUTTON_CLASS} disabled={!ready} onClick={onDetect}>
          Detect areas
        </button>
        <button type="button" className={BUTTON_CLASS} disabled={!ready} onClick={add}>
          <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Add area
        </button>
      </div>
      {obstructions.map((o) => {
        const problem = ready ? validateObstruction(o, rows, columns) : null;
        return (
          <div key={o.id} className="space-y-2 rounded-md border border-border p-2.5">
            <div className="flex items-center gap-2">
              <select
                aria-label="Obstruction type"
                className={INPUT_CLASS}
                value={o.kind}
                onChange={(event) => update(o.id, { kind: event.target.value as ObstructionKind })}
              >
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
              {o.proposed && (
                <button
                  type="button"
                  aria-label="Accept proposed area"
                  className="shrink-0 rounded-md border border-success/40 p-1.5 text-success"
                  onClick={() => update(o.id, { proposed: false })}
                >
                  <Check className="h-4 w-4" aria-hidden />
                </button>
              )}
              <button
                type="button"
                aria-label="Remove area"
                className="shrink-0 rounded-md border border-border p-1.5 text-muted hover:text-foreground"
                onClick={() => onChange(obstructions.filter((other) => other.id !== o.id))}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {NUMBER_FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11px] text-muted">{label}</span>
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
            <p className={`text-[11px] ${problem ? "text-warning" : "text-muted"}`}>
              {problem ?? describeObstruction(o)}
              {o.proposed && !problem ? " (proposed)" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
