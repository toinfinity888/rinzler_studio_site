import { describe, it, expect } from "vitest";
import { SECTIONS } from "@/lib/form-schema/sections";
import { expandFieldIds, SYSTEM_BLOCK_SUBFIELDS } from "@/lib/form-schema/types";
import { FR } from "@/lib/form-schema/fr";
import { t } from "@/lib/form-schema/i18n";

const REQUIRED_S1_FIELDS = [
  "s1.hotel_name",
  "s1.hotel_type",
  "s1.number_of_rooms",
  "s1.location",
  "s1.main_contact_name",
  "s1.contact_email",
];

describe("form schema integrity (FR-015, FR-023)", () => {
  it("has exactly 8 sections in order s1..s8", () => {
    expect(SECTIONS).toHaveLength(8);
    SECTIONS.forEach((s, i) => {
      expect(s.id).toBe(`s${i + 1}`);
      expect(s.order).toBe(i + 1);
    });
  });

  it("Section 1 carries every required field defined by FR-015", () => {
    const s1 = SECTIONS[0]!;
    const requiredIds = s1.fields.filter((f) => f.required).map((f) => f.id);
    expect(requiredIds.sort()).toEqual([...REQUIRED_S1_FIELDS].sort());
  });

  it("every field id matches the canonical s<N>.<snake> pattern", () => {
    for (const id of expandFieldIds(SECTIONS)) {
      expect(id).toMatch(/^s[1-8]\.[a-z0-9_]+(\.[a-z0-9_]+)?$/);
    }
  });

  it("Section 2 uses 10 system-blocks expanding to 50 sub-fields", () => {
    const s2 = SECTIONS[1]!;
    expect(s2.fields).toHaveLength(10);
    s2.fields.forEach((f) => expect(f.type).toBe("system-block"));
    const ids = expandFieldIds([s2]);
    expect(ids).toHaveLength(10 * SYSTEM_BLOCK_SUBFIELDS.length);
  });

  it("FR copy exists for every non-system-block field id", () => {
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        if (field.type === "system-block") continue;
        expect(FR[field.id], `missing FR copy for ${field.id}`).toBeDefined();
        expect(FR[field.id]!.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("t() composes labels for system-block sub-fields without crashing", () => {
    expect(t("s2.pms.provider").label).toMatch(/PMS.*Fournisseur/);
    expect(t("s2.channel_manager.satisfaction").label).toMatch(/Channel manager.*satisfaction/i);
    // Unknown id falls back to the id itself (no exception).
    expect(t("s2.does_not_exist.provider").label).toBe("s2.does_not_exist.provider");
  });
});
