"use client";

import type { ReactNode } from "react";

export const INPUT_CLASS =
  "w-full rounded-md border border-[#2A3038] bg-[#0A0E1A] px-2.5 py-1.5 text-sm text-[#F7F8FA] outline-none focus:border-[#3DAEFF]";

export const BUTTON_CLASS =
  "rounded-md border border-[#2A3038] bg-[#12161C] px-3 py-1.5 text-sm font-medium text-[#F7F8FA] transition-colors hover:border-[#3DAEFF] disabled:cursor-not-allowed disabled:opacity-40";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[#9BA3AF]">{label}</span>
      {children}
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Numeric text kept as a string, so a half-typed value is not rewritten under the cursor. */
export function NumberField({ label, value, onChange, disabled }: NumberFieldProps) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className={INPUT_CLASS}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-[#2A3038] bg-[#12161C] p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
