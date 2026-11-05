"use client";

import type { ReactNode } from "react";

export const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-50";

export const BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border";

export const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
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

export function StepPanel({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="step-in rounded-lg border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 mb-4 text-sm text-muted">{hint}</p>
      {children}
    </section>
  );
}
