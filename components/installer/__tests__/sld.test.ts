// components/installer/__tests__/sld.test.ts
//
// NEW test file (no existing tests touched). Covers the pure SLD structure
// builder that feeds the permit-ready single-line diagram.

import { describe, it, expect } from "vitest";
import { buildSldModel } from "@/components/installer/sld";
import type { BoM, SizingResult } from "@/lib/contracts";

type Engineering = NonNullable<SizingResult["engineering"]>;

function makeBoM(overrides: Partial<BoM> = {}): BoM {
  return {
    panels: { brand: "Trina", model: "Vertex S", count: 24, wp: 440 },
    inverter: { brand: "SMA", model: "Tripower", kw: 10 },
    totalEur: 18_000,
    ...overrides,
  };
}

describe("buildSldModel", () => {
  it("uses the sizer's string configuration verbatim when present", () => {
    const eng: Engineering = { modulesPerString: 20, stringCount: 3, dcAcRatio: 1.15 };
    const model = buildSldModel(makeBoM({ panels: { brand: "T", model: "M", count: 60, wp: 440 } }), eng);

    expect(model.stringConfigDerived).toBe(false);
    expect(model.modulesPerString).toBe(20);
    expect(model.strings).toBe(3);
    expect(model.dcAcRatio).toBe(1.15);
  });

  it("string count × modules-per-string ≈ module count (sizer + derived)", () => {
    // Exact factorisation from the sizer.
    const exact = buildSldModel(makeBoM({ panels: { brand: "T", model: "M", count: 60, wp: 440 } }), {
      modulesPerString: 20,
      stringCount: 3,
    });
    expect(exact.strings * exact.modulesPerString).toBe(60);

    // Derived layout: capacity must cover every module, with slack under one
    // string (no empty string, no dropped module).
    for (const count of [7, 10, 24, 25, 41, 50, 137]) {
      const model = buildSldModel(makeBoM({ panels: { brand: "T", model: "M", count, wp: 440 } }));
      const capacity = model.strings * model.modulesPerString;
      expect(model.stringConfigDerived).toBe(true);
      expect(capacity).toBeGreaterThanOrEqual(count);
      expect(capacity - count).toBeLessThan(model.modulesPerString);
      expect(model.strings).toBeGreaterThanOrEqual(1);
    }
  });

  it("always surfaces an inverter kW rating and array kWp", () => {
    const model = buildSldModel(makeBoM({ inverter: { brand: "SMA", model: "STP", kw: 12.5 } }));
    expect(model.inverterKw).toBe(12.5);
    expect(model.inverter.kw).toBe(12.5);
    // 24 × 440 Wp = 10.56 kWp → rounded to 1 decimal.
    expect(model.arrayKwp).toBeCloseTo(10.6, 5);
    // No engineering block → DC/AC ratio computed from array/inverter.
    expect(model.dcAcRatio).toBeCloseTo(0.8, 5);
  });

  it("is deterministic for identical input", () => {
    const bom = makeBoM({ panels: { brand: "T", model: "M", count: 137, wp: 415 } });
    const a = buildSldModel(bom);
    const b = buildSldModel(bom);
    expect(a).toEqual(b);
  });

  it("handles a missing engineering block gracefully", () => {
    const noEng = buildSldModel(makeBoM(), undefined);
    const nullEng = buildSldModel(makeBoM(), null);
    expect(noEng.stringConfigDerived).toBe(true);
    expect(noEng).toEqual(nullEng);
    expect(noEng.strings).toBeGreaterThan(0);
    expect(noEng.modulesPerString).toBeGreaterThan(0);
  });

  it("handles a zero-module BoM without dividing by zero", () => {
    const model = buildSldModel(makeBoM({ panels: { brand: "T", model: "M", count: 0, wp: 440 } }));
    expect(model.modules).toBe(0);
    expect(model.strings).toBe(0);
    expect(model.modulesPerString).toBe(0);
    expect(model.arrayKwp).toBe(0);
    expect(model.dcAcRatio).toBeUndefined();
  });

  it("carries a battery through only when the BoM includes storage", () => {
    const withBattery = buildSldModel(
      makeBoM({ battery: { brand: "BYD", model: "HVS", kwh: 12.8 } }),
    );
    expect(withBattery.battery).toEqual({ brand: "BYD", model: "HVS", kwh: 12.8 });

    const withoutBattery = buildSldModel(makeBoM());
    expect(withoutBattery.battery).toBeUndefined();
  });
});
