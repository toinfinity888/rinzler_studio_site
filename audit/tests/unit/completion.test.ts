import { describe, it, expect } from "vitest";
import { computeCompletionPct } from "@/lib/form-schema/completion";
import { SECTIONS } from "@/lib/form-schema/sections";

const REQUIRED_S1: Record<string, unknown> = {
  "s1.hotel_name": "Hôtel Test",
  "s1.hotel_type": "boutique",
  "s1.number_of_rooms": 25,
  "s1.location": "Lyon",
  "s1.main_contact_name": "Marie Dupont",
  "s1.contact_email": "marie@hoteltest.fr",
};

describe("computeCompletionPct (FR-007 progress, SC-006 autosave)", () => {
  it("returns 0 for an empty answer set", () => {
    expect(computeCompletionPct({}, SECTIONS)).toBe(0);
  });

  it("returns a low non-zero value when only Section 1 required fields are filled", () => {
    const pct = computeCompletionPct(REQUIRED_S1, SECTIONS);
    // Section 1 required = 6 fields × weight 2 = 12; total weighted ~ 130+
    // (system-blocks alone contribute 50). Expect something in 5..25 range.
    expect(pct).toBeGreaterThan(5);
    expect(pct).toBeLessThan(25);
  });

  it("treats null and empty string as not-filled", () => {
    const pct = computeCompletionPct(
      { ...REQUIRED_S1, "s1.hotel_name": "" },
      SECTIONS,
    );
    const pctFull = computeCompletionPct(REQUIRED_S1, SECTIONS);
    expect(pct).toBeLessThan(pctFull);
  });

  it("accepts a Map as the answers source", () => {
    const map = new Map<string, unknown>(Object.entries(REQUIRED_S1));
    const pct = computeCompletionPct(map, SECTIONS);
    expect(pct).toBeGreaterThan(0);
  });
});
