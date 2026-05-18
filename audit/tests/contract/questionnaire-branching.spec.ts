import { describe, it, expect } from "vitest";

import {
  evaluateExpression,
  evaluateAnyCondition,
  type ConditionContext,
} from "@/lib/questionnaire/condition-evaluator";
import { buildBlockSchema } from "@/lib/questionnaire/schema-builder";
import { computePrefills } from "@/lib/questionnaire/prefill";
import type { RenderableQuestion } from "@/lib/questionnaire/types";

/**
 * T064 — Contract test for the dynamic conditional rendering pipeline.
 *
 * The full DB-backed branching is exercised by the E2E test (T067). This
 * contract test pins the pure pieces of the contract:
 *
 *  - Condition AST evaluation (eq / not / all / any / scan-keyed).
 *  - `getNextQuestionBlock` schema_json contract: the runtime Zod schema
 *    matches the rows the renderer consumes (constitution v1.2.0).
 *  - Prefill source attribution (FR-016).
 *  - Conditional rendering removes questions when the hotelier's earlier
 *    answer disqualifies them.
 */

function ctx(
  answers: Record<string, unknown>,
  scanFindings: Record<string, unknown> = {},
): ConditionContext {
  return { answers, scanFindings };
}

function q(
  slug: string,
  answer_type: RenderableQuestion["answer_type"],
  options: string[],
): RenderableQuestion {
  return {
    question_id: slug + "_id",
    question_version_id: slug + "_v1",
    slug,
    block: "stack",
    answer_type,
    prompt: slug,
    helper: null,
    definition: { required: true, options },
    options: options.map((o) => ({ slug: o, label: o })),
    language_used: "fr",
    fallback_language_used: false,
  };
}

describe("condition-evaluator — pure AST", () => {
  it("evaluates a simple eq leaf against an answer", () => {
    expect(
      evaluateExpression(
        { answer: "primary_goal", op: "eq", value: "workload_reduction" },
        ctx({ primary_goal: "workload_reduction" }),
      ),
    ).toBe(true);
    expect(
      evaluateExpression(
        { answer: "primary_goal", op: "eq", value: "workload_reduction" },
        ctx({ primary_goal: "profitability" }),
      ),
    ).toBe(false);
  });

  it("supports legacy `{ answer, eq }` sugar", () => {
    expect(
      evaluateExpression(
        { answer: "pms_vendor", eq: "mews" } as never,
        ctx({ pms_vendor: "mews" }),
      ),
    ).toBe(true);
  });

  it("evaluates `all` / `any` / `not`", () => {
    const c = ctx({ pms_vendor: "mews", primary_goal: "ai_readiness" });
    expect(
      evaluateExpression(
        {
          all: [
            { answer: "pms_vendor", op: "eq", value: "mews" },
            { answer: "primary_goal", op: "eq", value: "ai_readiness" },
          ],
        },
        c,
      ),
    ).toBe(true);
    expect(
      evaluateExpression(
        {
          any: [
            { answer: "pms_vendor", op: "eq", value: "cloudbeds" },
            { answer: "primary_goal", op: "eq", value: "ai_readiness" },
          ],
        },
        c,
      ),
    ).toBe(true);
    expect(
      evaluateExpression(
        { not: { answer: "pms_vendor", op: "eq", value: "none" } },
        c,
      ),
    ).toBe(true);
  });

  it("multiple rows are OR-ed via evaluateAnyCondition", () => {
    const rows = [
      { answer: "pms_vendor", op: "eq" as const, value: "mews" },
      { answer: "pms_vendor", op: "eq" as const, value: "cloudbeds" },
    ];
    expect(evaluateAnyCondition(rows, ctx({ pms_vendor: "cloudbeds" }))).toBe(true);
    expect(evaluateAnyCondition(rows, ctx({ pms_vendor: "none" }))).toBe(false);
  });

  it("scan-keyed leaves read from scanFindings", () => {
    expect(
      evaluateExpression(
        { scan: "vendor_booking_engine", op: "eq", value: "d_edge" },
        ctx({}, { vendor_booking_engine: "d_edge" }),
      ),
    ).toBe(true);
  });
});

describe("schema-builder — runtime Zod derived from the same rows", () => {
  it("emits a serialized schema matching the question set", () => {
    const goal = q("primary_goal", "single", ["workload_reduction", "profitability"]);
    const { serialized, zod } = buildBlockSchema([goal]);
    expect(serialized.shape.primary_goal?.kind).toBe("single");
    expect(zod.shape.primary_goal).toBeDefined();
    // Server-side strict validation.
    expect(() => zod.parse({ primary_goal: "profitability" })).not.toThrow();
    expect(() => zod.parse({ primary_goal: "not-an-option" })).toThrow();
  });

  it("accepts arbitrary value for `voice` answers as a trimmed string", () => {
    const v = q("biggest_pain_voice", "voice", []);
    v.definition = { required: false, maxDurationSeconds: 60 };
    const { zod } = buildBlockSchema([v]);
    expect(() => zod.parse({ biggest_pain_voice: "I lose 2h/day on emails." })).not.toThrow();
  });
});

describe("prefill — source attribution (FR-016)", () => {
  it("pre-fills `pms_vendor` from `vendor_pms` scan finding when the option matches", () => {
    const question = q("pms_vendor", "dropdown", ["mews", "cloudbeds", "other", "none"]);
    const out = computePrefills([question], {
      scanFindings: { vendor_pms: "mews" },
      existingAnswers: {},
    });
    expect(out).toEqual([
      { question_slug: "pms_vendor", value: "mews", source: "scan" },
    ]);
  });

  it("never overwrites an existing hotelier answer", () => {
    const question = q("pms_vendor", "dropdown", ["mews", "cloudbeds"]);
    const out = computePrefills([question], {
      scanFindings: { vendor_pms: "mews" },
      existingAnswers: { pms_vendor: "cloudbeds" },
    });
    expect(out).toEqual([]);
  });

  it("attributes consultant pre-fills with source 'consultant'", () => {
    const question = q("pms_vendor", "dropdown", ["mews", "cloudbeds"]);
    const out = computePrefills([question], {
      scanFindings: {},
      existingAnswers: {},
      consultantPrefill: { pms_vendor: "cloudbeds" },
    });
    expect(out).toEqual([
      { question_slug: "pms_vendor", value: "cloudbeds", source: "consultant" },
    ]);
  });

  it("yes_no_unknown is coerced from boolean", () => {
    const question = q("whatsapp_visible", "yes_no_unknown", []);
    const out = computePrefills([question], {
      scanFindings: { whatsapp_visible: true },
      existingAnswers: {},
    });
    expect(out).toEqual([
      { question_slug: "whatsapp_visible", value: "yes", source: "scan" },
    ]);
  });
});
