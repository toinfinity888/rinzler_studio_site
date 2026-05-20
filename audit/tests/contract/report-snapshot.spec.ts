import { describe, it, expect } from "vitest";

import { runEngine } from "@/lib/recommend/engine";
import { buildSnapshot, REPORT_SCHEMA_VERSION } from "@/lib/report/snapshot-builder";
import type {
  RecommendationContext,
  VendorCatalogueEntry,
  AnswerInput,
} from "@/lib/recommend/types";

/**
 * US 3 contract tests (T083 / T084 / T085).
 *
 * These pin the report-snapshot contract through pure helpers:
 *  - T083: every documented section is present in `rendered_json` with
 *    the canonical schema_version.
 *  - T084: a snapshot is by-value; mutating the source vendor catalogue
 *    after building does NOT alter the rendered output (SC-020).
 *  - T085: changing the project's goal/budget produces a materially
 *    different report (SC-013).
 *
 * No DB, no Bedrock — we feed `runEngine` a fully synthetic
 * `RecommendationContext` and walk the engine + snapshot-builder
 * deterministic outputs.
 */

function makeVendor(overrides: Partial<VendorCatalogueEntry> = {}): VendorCatalogueEntry {
  return {
    id: "v-alpha",
    slug: "alpha-pms",
    category: "pms",
    currentVersionId: "vv-alpha-1",
    category_label: "PMS",
    targetHotelSizes: ["small", "medium"],
    targetPropertyTypes: ["independent", "boutique"],
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
  const answers: AnswerInput[] = overrides.answers ?? [
    {
      question_slug: "uses_ai_in_guest_replies",
      question_version_id: "qv-1",
      value: "no",
      source: "client",
      confidence: "high",
    },
    {
      question_slug: "has_privacy_policy",
      question_version_id: "qv-2",
      value: "yes",
      source: "client",
      confidence: "high",
    },
  ];
  const answersByslug: Record<string, unknown> = {};
  const answerConfidence: Record<string, string> = {};
  for (const a of answers) {
    answersByslug[a.question_slug] = a.value;
    answerConfidence[a.question_slug] = a.confidence;
  }
  return {
    project: {
      id: "p-test",
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
    vendorCatalogue: [makeVendor()],
    ...overrides,
  };
}

function build(ctx: RecommendationContext) {
  const engine = runEngine(ctx);
  const snap = buildSnapshot({
    project: {
      ...ctx.project,
      language: ctx.hotel.primary_language,
      hotel_id: "h-test",
    },
    hotel: ctx.hotel,
    engine,
    referencedQuestionVersionIds: ctx.answers
      .map((a) => a.question_version_id)
      .filter((v): v is string => !!v),
    publishedAt: new Date("2026-05-20T10:00:00Z"),
  });
  return { engine, snap };
}

/* -------------------------------------------------------------------- */
/* T083 — report-export.schema conformance for a synthetic project      */
/* -------------------------------------------------------------------- */

describe("T083 — rendered_json contains every documented section (FR-026)", () => {
  it("includes the canonical schema_version", () => {
    const { snap } = build(makeCtx());
    expect(snap.renderedJson.schema_version).toBe(REPORT_SCHEMA_VERSION);
  });

  it("contains all 11 documented top-level sections", () => {
    const { snap } = build(makeCtx());
    const json = snap.renderedJson;
    for (const key of [
      "project",
      "executive_summary",
      "readiness_scores",
      "opportunity_map",
      "bottleneck_analysis",
      "tool_stack_overview",
      "scenarios",
      "recommendations",
      "tool_shortlist",
      "what_not_to_do_now",
      "impact_analysis",
      "roadmap",
      "compliance_checklist",
      "next_steps",
      "metadata",
    ]) {
      expect(json[key]).toBeDefined();
    }
  });

  it("guarantees at least one entry in what_not_to_do_now (FR-033 / SC-007)", () => {
    const { snap } = build(makeCtx());
    const not = snap.renderedJson["what_not_to_do_now"] as unknown[];
    expect(Array.isArray(not)).toBe(true);
    expect(not.length).toBeGreaterThan(0);
  });

  it("roadmap has the 5 bucket arrays (immediate, 30d, 60d, 90d, postponed)", () => {
    const { snap } = build(makeCtx());
    const roadmap = snap.renderedJson["roadmap"] as Record<string, unknown[]>;
    for (const b of ["immediate", "thirty_day", "sixty_day", "ninety_day", "postponed"]) {
      expect(Array.isArray(roadmap[b])).toBe(true);
    }
  });

  it("metadata pins rule_engine_version + referenced vendor/question versions", () => {
    const { snap } = build(makeCtx());
    const meta = snap.renderedJson["metadata"] as Record<string, unknown>;
    expect(typeof meta.rule_engine_version).toBe("string");
    expect(Array.isArray(meta.referenced_vendor_versions)).toBe(true);
    expect(Array.isArray(meta.referenced_question_versions)).toBe(true);
  });
});

/* -------------------------------------------------------------------- */
/* T084 — snapshot immutability (SC-020)                                 */
/* -------------------------------------------------------------------- */

describe("T084 — snapshot is by-value; later vendor edits do NOT mutate it (SC-020)", () => {
  it("does not change rendered_json when the source vendor catalogue is mutated", () => {
    const ctx = makeCtx();
    const { snap } = build(ctx);
    const before = JSON.stringify(snap.renderedJson);

    // Simulate a post-publish vendor admin edit on the same catalogue
    // object the engine just consumed.
    ctx.vendorCatalogue[0]!.priceTier = "premium";
    ctx.vendorCatalogue[0]!.gdprPosture = "non_compliant";
    ctx.vendorCatalogue.push(makeVendor({ id: "v-beta", slug: "beta-pms" }));

    const after = JSON.stringify(snap.renderedJson);
    expect(after).toBe(before);
  });

  it("does not change rendered_json when the engine output is mutated post-build", () => {
    const ctx = makeCtx();
    const { engine, snap } = build(ctx);
    const before = JSON.stringify(snap.renderedJson);

    engine.executive_summary = "MUTATED";
    engine.recommendations.length = 0;

    const after = JSON.stringify(snap.renderedJson);
    expect(after).toBe(before);
  });
});

/* -------------------------------------------------------------------- */
/* T085 — different budget/goal → materially different report (SC-013)   */
/* -------------------------------------------------------------------- */

describe("T085 — same hotel, different budget/goal → materially different output (SC-013)", () => {
  it("reorders or replaces recommendations when the primary goal changes", () => {
    const a = build(
      makeCtx({
        project: {
          id: "p-a",
          tier: "full",
          goal_primary: "workload_reduction",
          goal_secondary: [],
          budget_level: "moderate",
        },
      }),
    );
    const b = build(
      makeCtx({
        project: {
          id: "p-b",
          tier: "full",
          goal_primary: "direct_bookings",
          goal_secondary: [],
          budget_level: "moderate",
        },
      }),
    );

    const recsA = JSON.stringify(a.snap.renderedJson["recommendations"]);
    const recsB = JSON.stringify(b.snap.renderedJson["recommendations"]);
    const execA = a.snap.renderedJson["executive_summary"];
    const execB = b.snap.renderedJson["executive_summary"];

    // Either recommendation set OR the executive summary must differ —
    // anything else and the engine would be ignoring the goal signal.
    const materiallyDifferent = recsA !== recsB || execA !== execB;
    expect(materiallyDifferent).toBe(true);
  });

  it("the rendered project.goal_primary echoes the input goal", () => {
    const a = build(
      makeCtx({
        project: {
          id: "p-a",
          tier: "full",
          goal_primary: "ai_readiness",
          goal_secondary: [],
          budget_level: "moderate",
        },
      }),
    );
    const projectBlock = a.snap.renderedJson["project"] as Record<string, unknown>;
    expect(projectBlock.goal_primary).toBe("ai_readiness");
  });

  it("budget=none vs budget=high surfaces different roadmap / shortlist shapes", () => {
    const none = build(
      makeCtx({
        project: {
          id: "p-none",
          tier: "full",
          goal_primary: "workload_reduction",
          goal_secondary: [],
          budget_level: "none",
        },
      }),
    );
    const high = build(
      makeCtx({
        project: {
          id: "p-high",
          tier: "full",
          goal_primary: "workload_reduction",
          goal_secondary: [],
          budget_level: "high",
        },
      }),
    );

    const sigA = JSON.stringify({
      shortlist: none.snap.renderedJson["tool_shortlist"],
      roadmap: none.snap.renderedJson["roadmap"],
      not: none.snap.renderedJson["what_not_to_do_now"],
    });
    const sigB = JSON.stringify({
      shortlist: high.snap.renderedJson["tool_shortlist"],
      roadmap: high.snap.renderedJson["roadmap"],
      not: high.snap.renderedJson["what_not_to_do_now"],
    });
    expect(sigA).not.toBe(sigB);
  });
});
