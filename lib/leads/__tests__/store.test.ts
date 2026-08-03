// lib/leads/__tests__/store.test.ts
// Covers updateLeadPreview: the persistence plumbing that lets the installer
// detail view's live-recalculated roof facts/panel count/roof segments sync
// back into the stored lead, so the marketplace list stops showing a stale
// creation-time snapshot.

import { describe, it, expect } from "vitest";
import { buildLead, createLead, getLead, updateLeadPreview, type CreateLeadInput } from "@/lib/leads/store";

let counter = 0;

function makeLead(overrides: Partial<CreateLeadInput> = {}): CreateLeadInput {
  counter += 1;
  return {
    id: `test-lead-${counter}`,
    address: "Reichstag, Berlin, Germany",
    lat: 52.52,
    lng: 13.38,
    monthlyBillEur: 180,
    ev: false,
    heating: "gas",
    goal: "lower_bill",
    ...overrides,
  };
}

describe("updateLeadPreview", () => {
  it("merges roofFacts partially without clobbering other roofFacts keys", () => {
    const input = makeLead();
    const lead = createLead(buildLead(input));
    const before = lead.publicPreview.roofFacts;
    expect(before.totalAreaM2).toBeDefined();
    expect(before.pitchDeg).toBeDefined();

    const updated = updateLeadPreview(input.id, { roofFacts: { totalAreaM2: 999 } });

    expect(updated).not.toBeNull();
    expect(updated!.publicPreview.roofFacts.totalAreaM2).toBe(999);
    // Untouched keys survive the shallow merge.
    expect(updated!.publicPreview.roofFacts.pitchDeg).toBe(before.pitchDeg);
    expect(updated!.publicPreview.roofFacts.azimuth).toBe(before.azimuth);
    expect(updated!.publicPreview.roofFacts.segmentsCount).toBe(before.segmentsCount);
  });

  it("updates panelCount when provided without touching other sizing fields", () => {
    const input = makeLead();
    const lead = createLead(buildLead(input));
    const beforeSizing = lead.publicPreview.sizing;

    const updated = updateLeadPreview(input.id, { panelCount: 42 });

    expect(updated).not.toBeNull();
    expect(updated!.publicPreview.sizing.panelCount).toBe(42);
    expect(updated!.publicPreview.sizing.usableRoofAreaM2).toBe(beforeSizing.usableRoofAreaM2);
    expect(updated!.publicPreview.sizing.variants).toBe(beforeSizing.variants);
  });

  it("stores roofSegments when provided", () => {
    const input = makeLead();
    createLead(buildLead(input));

    const segments = [
      { pitchDegrees: 30, azimuthDegrees: 190, areaMeters2: 50, annualSunshineHours: 1200 },
    ];
    const updated = updateLeadPreview(input.id, { roofSegments: segments });

    expect(updated).not.toBeNull();
    expect(updated!.publicPreview.roofSegments).toEqual(segments);
  });

  it("returns null for an unknown id", () => {
    const updated = updateLeadPreview("does-not-exist", { panelCount: 5 });
    expect(updated).toBeNull();
  });

  it("does not affect unrelated lead fields (status, offer, etc.)", () => {
    const input = makeLead();
    const lead = createLead(buildLead(input));
    expect(lead.status).toBe("new");
    expect(lead.offer).toBeUndefined();

    const updated = updateLeadPreview(input.id, { panelCount: 10 });

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe(lead.status);
    expect(updated!.offer).toBe(lead.offer);
    expect(updated!.privateDetails).toEqual(lead.privateDetails);
    expect(updated!.id).toBe(lead.id);

    // Store is actually persisted, not just returned.
    expect(getLead(input.id)?.publicPreview.sizing.panelCount).toBe(10);
  });
});
