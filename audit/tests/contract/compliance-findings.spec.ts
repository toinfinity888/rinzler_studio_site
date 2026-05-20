import { describe, it, expect } from "vitest";

import { evaluateCompliance } from "@/lib/compliance/evaluator";
import { lowerConfidenceForUnknownGdpr } from "@/lib/recommend/engine";
import type {
  RecommendationContext,
  RuleRecommendation,
  VendorCatalogueEntry,
} from "@/lib/recommend/types";

/**
 * T115 / T116 — Contract tests for the compliance & risk layer (US 7).
 *
 * T115 pins the "AI-without-transparency" pattern (FR-050 / FR-051).
 * T116 pins FR-053 — unknown GDPR posture lowers recommendation confidence
 * by exactly one step.
 *
 * Both tests stay below the full engine to isolate the contract from
 * unrelated rule changes; the engine wires these exact helpers in
 * `runEngine()`.
 */

function makeVendor(overrides: Partial<VendorCatalogueEntry> = {}): VendorCatalogueEntry {
  return {
    id: "v1",
    slug: "vendor-x",
    category: "pms",
    currentVersionId: "vv1",
    category_label: "PMS",
    targetHotelSizes: ["small"],
    targetPropertyTypes: ["independent"],
    countriesServed: ["FR"],
    languagesSupported: ["fr"],
    independentHotelSuitability: "high",
    smallHotelSuitability: "high",
    implementationComplexity: "medium",
    priceTier: "mid",
    frenchMarketRelevance: "high",
    gdprPosture: "compliant",
    euHosting: "yes",
    aiFeatures: [],
    automationCapabilities: [],
    tags: [],
    confidence: "high",
    ...overrides,
  };
}

function makeCtx(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  const answers = overrides.answers ?? [];
  const answersByslug: Record<string, unknown> = {};
  const answerConfidence: Record<string, string> = {};
  for (const a of answers) {
    answersByslug[a.question_slug] = a.value;
    answerConfidence[a.question_slug] = a.confidence;
  }
  return {
    project: {
      id: "p1",
      tier: "full",
      goal_primary: "workload_reduction",
      goal_secondary: [],
      budget_level: "moderate",
    },
    hotel: {
      property_type: "independent",
      room_count: 28,
      country: "FR",
      region: "Île-de-France",
      city: "Paris",
      primary_language: "fr",
      star_rating: 3,
    },
    answers,
    answersByslug,
    answerConfidence,
    scanFindings: [],
    scanByField: {},
    vendorCatalogue: [],
    ...overrides,
    // Re-apply derived maps if the caller overrode `answers`.
    ...(overrides.answers ? { answersByslug, answerConfidence } : {}),
  };
}

describe("compliance — AI-without-transparency finding (T115 / FR-050)", () => {
  it("produces an `ai_transparency` finding when AI is used and no notice is published", () => {
    const ctx = makeCtx({
      answers: [
        {
          question_slug: "uses_ai_in_guest_replies",
          question_version_id: null,
          value: "yes",
          source: "client",
          confidence: "high",
        },
        {
          question_slug: "ai_transparency_notice",
          question_version_id: null,
          value: "no",
          source: "client",
          confidence: "high",
        },
      ],
    });

    const findings = evaluateCompliance(ctx);
    const f = findings.find((x) => x.topic === "ai_transparency");
    expect(f).toBeDefined();
    expect(f?.severity).toBe("risk");
    expect(f?.explanation.length).toBeGreaterThan(20);
    expect(f?.checklist_item.length).toBeGreaterThan(20);
    expect(f?.vendor_id).toBeNull();
  });

  it("does NOT emit the AI-transparency finding when a notice is already in place", () => {
    const ctx = makeCtx({
      answers: [
        {
          question_slug: "uses_ai_in_guest_replies",
          question_version_id: null,
          value: "yes",
          source: "client",
          confidence: "high",
        },
        {
          question_slug: "ai_transparency_notice",
          question_version_id: null,
          value: "yes",
          source: "client",
          confidence: "high",
        },
      ],
    });
    const findings = evaluateCompliance(ctx);
    expect(findings.find((x) => x.topic === "ai_transparency")).toBeUndefined();
  });

  it("renders the English variant when hotel.primary_language is 'en'", () => {
    const ctx = makeCtx({
      hotel: {
        property_type: "boutique",
        room_count: 20,
        country: "PT",
        region: null,
        city: "Lisbon",
        primary_language: "en",
        star_rating: 3,
      },
      answers: [
        {
          question_slug: "uses_ai_in_guest_replies",
          question_version_id: null,
          value: "yes",
          source: "client",
          confidence: "high",
        },
        {
          question_slug: "ai_transparency_notice",
          question_version_id: null,
          value: "no",
          source: "client",
          confidence: "high",
        },
      ],
    });
    const findings = evaluateCompliance(ctx);
    const f = findings.find((x) => x.topic === "ai_transparency");
    expect(f?.explanation).toMatch(/AI|transparency/i);
    expect(f?.explanation).not.toMatch(/sans information explicite/);
  });

  it("emits one per-vendor finding for each vendor with euHosting=unknown", () => {
    const ctx = makeCtx({
      vendorCatalogue: [
        makeVendor({ id: "v-a", slug: "alpha", euHosting: "unknown" }),
        makeVendor({ id: "v-b", slug: "beta", euHosting: "yes" }),
        makeVendor({ id: "v-c", slug: "gamma", euHosting: "unknown" }),
      ],
    });
    const findings = evaluateCompliance(ctx).filter(
      (f) => f.topic === "eu_hosting_unknown",
    );
    expect(findings).toHaveLength(2);
    const slugsInExplanations = findings.map((f) => f.explanation);
    expect(slugsInExplanations.some((e) => e.includes("alpha"))).toBe(true);
    expect(slugsInExplanations.some((e) => e.includes("gamma"))).toBe(true);
  });
});

/* -------------------------------------------------------------------- */
/* T116 — FR-053 confidence reduction                                    */
/* -------------------------------------------------------------------- */

function makeRec(overrides: Partial<RuleRecommendation> = {}): RuleRecommendation {
  return {
    id: "r1",
    action: "Adopt vendor-x",
    scenario_kind: "balanced",
    vendor_id: "v1",
    vendor_version_id: "vv1",
    vendor_name: "Vendor X",
    vendor_category: "pms",
    explanation: {
      relevance: "",
      problem_solved: "",
      change: "",
      benefit: "",
      effort: "",
      risks: "",
      check_before: "",
      alternatives: [],
      do_nothing_consequence: "",
    },
    impact: {
      operational: "medium",
      workload_reduction: "medium",
      guest_experience: "medium",
      response_speed: "medium",
      consistency: "medium",
      onboarding: "medium",
      direct_booking: "medium",
      complexity: "medium",
      cost_band: "mid",
      time_to_deploy: "60d",
      risk_level: "medium",
      dependencies: [],
      confidence: "high",
    },
    confidence: "high",
    do_not_do_now: false,
    do_not_do_reason: null,
    signals_consulted: { answers: [], scan_findings: [], vendor_fields: [] },
    rule_id: "test-rule",
    priority: 1,
    expected_effort: "medium",
    expected_impact: "medium",
    dependencies: [],
    recommended_owner: "hotelier",
    ...overrides,
  };
}

describe("compliance — unknown GDPR posture reduces confidence (T116 / FR-053)", () => {
  it("lowers a high-confidence recommendation to medium when vendor.gdprPosture=unknown", () => {
    const ctx = makeCtx({
      vendorCatalogue: [makeVendor({ id: "v1", gdprPosture: "unknown" })],
    });
    const rec = makeRec({ confidence: "high" });
    const [out] = lowerConfidenceForUnknownGdpr([rec], ctx);
    if (!out) throw new Error("expected one recommendation back");
    expect(out.confidence).toBe("medium");
    expect(out.signals_consulted.vendor_fields).toContain("gdprPosture");
    expect(out.signals_consulted.vendor_fields).toContain("euHosting");
  });

  it("lowers a medium-confidence recommendation to low when vendor.euHosting=unknown", () => {
    const ctx = makeCtx({
      vendorCatalogue: [makeVendor({ id: "v1", euHosting: "unknown" })],
    });
    const rec = makeRec({ confidence: "medium" });
    const [out] = lowerConfidenceForUnknownGdpr([rec], ctx);
    if (!out) throw new Error("expected one recommendation back");
    expect(out.confidence).toBe("low");
  });

  it("leaves confidence untouched when the vendor's GDPR posture is known", () => {
    const ctx = makeCtx({
      vendorCatalogue: [
        makeVendor({ id: "v1", gdprPosture: "compliant", euHosting: "yes" }),
      ],
    });
    const rec = makeRec({ confidence: "high" });
    const [out] = lowerConfidenceForUnknownGdpr([rec], ctx);
    if (!out) throw new Error("expected one recommendation back");
    expect(out.confidence).toBe("high");
    expect(out.signals_consulted.vendor_fields).not.toContain("gdprPosture");
  });

  it("leaves recommendations with no vendor_id untouched", () => {
    const ctx = makeCtx({
      vendorCatalogue: [makeVendor({ id: "v1", gdprPosture: "unknown" })],
    });
    const rec = makeRec({ vendor_id: null, confidence: "high" });
    const [out] = lowerConfidenceForUnknownGdpr([rec], ctx);
    if (!out) throw new Error("expected one recommendation back");
    expect(out.confidence).toBe("high");
  });
});
