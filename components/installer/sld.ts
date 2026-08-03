// components/installer/sld.ts
//
// Pure, deterministic structure-builder for the permit-ready single-line
// diagram (SLD). Kept free of React / SVG so it is trivially unit-testable:
// same (bom, engineering) in → same SldModel out, no I/O, no randomness.
//
// The numbers here are NEVER invented — they are read from the selected
// variant's BoM (module count/Wp, inverter kW, battery kWh) and the sizer's
// deterministic engineering block (string configuration, DC/AC ratio). When
// the engineering block omits the string layout (residential / pitched
// results), we derive a balanced, deterministic configuration so the diagram
// still renders honest structure rather than a blank.

import type { BoM, SizingResult } from "@/lib/contracts";

type Engineering = NonNullable<SizingResult["engineering"]>;

export interface SldModel {
  /** Total PV modules in the array (from BoM panel count). */
  modules: number;
  /** Per-module nameplate in watts-peak. */
  moduleWp: number;
  /** Array DC nameplate in kWp (modules × Wp), rounded to 1 decimal. */
  arrayKwp: number;
  /** Modules wired in series per string. */
  modulesPerString: number;
  /** Number of parallel strings. */
  strings: number;
  /** True when the string layout was derived here (sizer omitted it). */
  stringConfigDerived: boolean;
  /** Inverter identity + AC nameplate (kW) from the BoM. */
  inverter: { brand: string; model: string; kw: number };
  /** Convenience mirror of inverter.kw. */
  inverterKw: number;
  /** DC/AC oversizing ratio — from the sizer when present, else computed. */
  dcAcRatio?: number;
  /** Present only when the BoM includes storage. */
  battery?: { brand: string; model: string; kwh: number };
}

/** Typical series-string length we aim for when deriving a layout. */
const PREFERRED_MODULES_PER_STRING = 20;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build the deterministic SLD structure from a BoM + optional engineering
 * block. Pure: no side effects, safe to call in render or in a test.
 */
export function buildSldModel(bom: BoM, engineering?: Engineering | null): SldModel {
  const modules = Math.max(0, Math.round(bom.panels?.count ?? 0));
  const moduleWp = Math.max(0, bom.panels?.wp ?? 0);
  const arrayKwp = round1((modules * moduleWp) / 1000);

  const engPerString = engineering?.modulesPerString;
  const engStrings = engineering?.stringCount;

  let modulesPerString: number;
  let strings: number;
  let stringConfigDerived: boolean;

  if (
    typeof engPerString === "number" &&
    engPerString > 0 &&
    typeof engStrings === "number" &&
    engStrings > 0
  ) {
    // Trust the sizer's engineering block verbatim.
    modulesPerString = Math.round(engPerString);
    strings = Math.round(engStrings);
    stringConfigDerived = false;
  } else if (modules <= 0) {
    modulesPerString = 0;
    strings = 0;
    stringConfigDerived = true;
  } else {
    // Derive a balanced layout: pick a string count near the preferred series
    // length, then distribute modules evenly (ceil) so no string overflows and
    // strings × modulesPerString ≈ module count (slack always < one string).
    strings = Math.max(1, Math.round(modules / PREFERRED_MODULES_PER_STRING));
    modulesPerString = Math.ceil(modules / strings);
    stringConfigDerived = true;
  }

  const inverterKw = Math.max(0, bom.inverter?.kw ?? 0);
  const computedDcAc =
    inverterKw > 0 && arrayKwp > 0 ? round1(arrayKwp / inverterKw) : undefined;
  const dcAcRatio =
    typeof engineering?.dcAcRatio === "number"
      ? engineering.dcAcRatio
      : computedDcAc;

  return {
    modules,
    moduleWp,
    arrayKwp,
    modulesPerString,
    strings,
    stringConfigDerived,
    inverter: {
      brand: bom.inverter?.brand ?? "Inverter",
      model: bom.inverter?.model ?? "",
      kw: inverterKw,
    },
    inverterKw,
    dcAcRatio,
    battery: bom.battery
      ? { brand: bom.battery.brand, model: bom.battery.model, kwh: bom.battery.kwh }
      : undefined,
  };
}
