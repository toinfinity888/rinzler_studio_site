import { describe, it, expect } from "vitest";

import { generateBrief, type BriefGeneratorInput } from "@/lib/funding/brief-generator";
import {
  FUNDING_DISCLAIMER_FR,
  FUNDING_DISCLAIMER_EN,
} from "@/lib/funding/types";

/**
 * T121 / T122 — Contract tests for the funding-readiness brief.
 *
 * The generator is a pure function: given hotel + project + answers + the
 * latest rendered snapshot, it produces a `FundingBriefContent`. These
 * tests pin the contract so future tweaks can't accidentally:
 *  - drop the eligibility disclaimer
 *  - drop a documented section
 *  - silently produce a FR-specific document for a non-FR market
 */

function baseInput(overrides: Partial<BriefGeneratorInput> = {}): BriefGeneratorInput {
  return {
    language: "fr",
    hotel: {
      name: "Hôtel des Tests",
      property_type: "independent",
      room_count: 28,
      star_rating: 3,
      city: "Paris",
      region: "Île-de-France",
      country: "FR",
    },
    project: {
      contact_email: "owner@example.com",
      goal_primary: "direct_bookings",
      goal_secondary: ["workload_reduction", "ai_readiness"],
      budget_level: "moderate",
    },
    answers: { contact_role: "Directeur" },
    reportRendered: {
      recommendations: [
        {
          id: "r1",
          action: "Améliorer le tunnel direct",
          impact: { cost_band: "mid" },
        },
        {
          id: "r2",
          action: "Ajouter schema.org Hotel",
          impact: { cost_band: "entry" },
        },
        {
          id: "r3",
          action: "Centraliser FAQ",
          impact: { cost_band: "variable" },
        },
      ],
      roadmap: {
        thirty_day: [{ recommendation_id: "r2" }],
        sixty_day: [{ recommendation_id: "r1" }],
        ninety_day: [{ recommendation_id: "r3" }],
      },
      readiness_scores: [{ dimension: "ai_search", value: 42 }],
    },
    ...overrides,
  };
}

describe("funding brief — section contract (T122)", () => {
  it("produces every documented section with the v1 schema_version", () => {
    const brief = generateBrief(baseInput());

    expect(brief.schema_version).toBe("funding-brief.v1");
    expect(brief.language).toBe("fr");
    expect(brief.company_info).toBeDefined();
    expect(brief.project_description.one_line.length).toBeGreaterThan(0);
    expect(brief.project_description.paragraph.length).toBeGreaterThan(0);
    expect(brief.digital_transformation_goals.length).toBeGreaterThan(0);
    expect(brief.ai_data_objectives.length).toBeGreaterThanOrEqual(3);
    expect(brief.expected_benefits.length).toBeGreaterThanOrEqual(3);
    expect(brief.implementation_roadmap.length).toBe(3);
    expect(brief.budget_estimate.bands.length).toBeGreaterThan(0);
    expect(brief.budget_estimate.notes.length).toBeGreaterThan(0);
    expect(brief.supporting_documents_checklist.length).toBeGreaterThan(0);
    expect(brief.missing_inputs.length).toBeGreaterThan(0);
  });

  it("includes the French eligibility disclaimer verbatim when language=fr", () => {
    const brief = generateBrief(baseInput({ language: "fr" }));
    expect(brief.eligibility_disclaimer).toBe(FUNDING_DISCLAIMER_FR);
  });

  it("includes the English eligibility disclaimer verbatim when language=en", () => {
    const brief = generateBrief(baseInput({ language: "en" }));
    expect(brief.eligibility_disclaimer).toBe(FUNDING_DISCLAIMER_EN);
  });

  it("derives the roadmap from rendered.roadmap by mapping recommendation_id → action", () => {
    const brief = generateBrief(baseInput());
    const horizons = Object.fromEntries(
      brief.implementation_roadmap.map((h) => [h.horizon, h.actions]),
    );
    expect(horizons["30d"]).toContain("Ajouter schema.org Hotel");
    expect(horizons["60d"]).toContain("Améliorer le tunnel direct");
    expect(horizons["90d"]).toContain("Centraliser FAQ");
  });

  it("groups budget bands by (bucket, cost_band) with non-zero counts", () => {
    const brief = generateBrief(baseInput());
    for (const b of brief.budget_estimate.bands) {
      expect(b.count).toBeGreaterThan(0);
      expect(["30d", "60d", "90d"]).toContain(b.bucket);
      expect([
        "entry",
        "mid",
        "premium",
        "variable",
        "unknown",
      ]).toContain(b.cost_band);
    }
  });

  it("emits an empty roadmap and empty budget bands when no report snapshot exists", () => {
    const brief = generateBrief(baseInput({ reportRendered: null }));
    expect(brief.implementation_roadmap).toEqual([]);
    expect(brief.budget_estimate.bands).toEqual([]);
    // Notes string is still present so the section never renders empty.
    expect(brief.budget_estimate.notes.length).toBeGreaterThan(0);
  });

  it("includes FR-specific documents (Kbis, SIRET, liasse fiscale) for FR hotels", () => {
    const brief = generateBrief(baseInput());
    const docs = brief.supporting_documents_checklist.map((d) => d.doc.toLowerCase());
    expect(docs.some((d) => d.includes("kbis"))).toBe(true);
    expect(docs.some((d) => d.includes("siret"))).toBe(true);
    expect(docs.some((d) => d.includes("liasse") || d.includes("bilans"))).toBe(true);
  });

  it("flags missing additional inputs and marks legal_name+SIRET as required", () => {
    const brief = generateBrief(baseInput());
    const byField = Object.fromEntries(
      brief.missing_inputs.map((m) => [m.field, m]),
    );
    expect(byField["legal_name"]?.required).toBe(true);
    expect(byField["siret"]?.required).toBe(true);
    expect(byField["annual_revenue_kEUR"]?.required).toBe(false);
  });

  it("drops the required SIRET entry once it has been provided", () => {
    const brief = generateBrief(
      baseInput({
        additionalInputs: { legal_name: "Hotel SAS", siret: "12345678901234" },
      }),
    );
    const fields = brief.missing_inputs.map((m) => m.field);
    expect(fields).not.toContain("legal_name");
    expect(fields).not.toContain("siret");
  });
});

describe("funding brief — non-FR graceful behaviour (T121)", () => {
  it("omits FR-only documents (Kbis, SIRET, liasse fiscale) when country is not FR", () => {
    const brief = generateBrief(
      baseInput({
        hotel: {
          name: "Test Hotel",
          property_type: "boutique",
          room_count: 20,
          star_rating: 3,
          city: "Lisbon",
          region: "Lisboa",
          country: "PT",
        },
        language: "en",
      }),
    );
    const docs = brief.supporting_documents_checklist.map((d) => d.doc.toLowerCase());
    expect(docs.some((d) => d.includes("kbis"))).toBe(false);
    expect(docs.some((d) => d.includes("siret"))).toBe(false);
    expect(docs.some((d) => d.includes("liasse"))).toBe(false);
    // The brief still has at least the universal items (RIB, vendor quotes, framing note).
    expect(brief.supporting_documents_checklist.length).toBeGreaterThanOrEqual(3);
  });

  it("does not require SIRET in missing_inputs for non-FR hotels", () => {
    const brief = generateBrief(
      baseInput({
        hotel: {
          name: "Test Hotel",
          property_type: "boutique",
          room_count: 20,
          star_rating: 3,
          city: "Lisbon",
          region: "Lisboa",
          country: "PT",
        },
      }),
    );
    const fields = brief.missing_inputs.map((m) => m.field);
    expect(fields).not.toContain("siret");
  });
});
