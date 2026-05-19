/**
 * T073 — Recommendation reasoning prompt + Zod tool-output schema (P1).
 *
 * Spec: `specs/003-hotel-diagnostic-platform/contracts/ai-prompts.md` § P1.
 *
 * This module exports:
 *   - The Zod schema for the structured tool output (used to validate Claude
 *     responses and to enable type inference for the merge step).
 *   - The system message segments (stable prefix for prompt caching) +
 *     the per-project user-message builder.
 *
 * The worker calls Claude only when `BEDROCK_ENABLED=true`. The Zod schema
 * also doubles as the runtime guard for the merge step (consumed by
 * `ai.worker.ts`).
 */
import { z } from "zod";

import type {
  EngineOutput,
  RecommendationContext,
} from "@/lib/recommend/types";

/* ----------------------------- Zod schema ----------------------------- */

export const BandSchema = z.enum(["low", "medium", "high"]);
export const SeveritySchema = z.enum(["info", "advisory", "risk"]);

export const ExplanationSchema = z.object({
  relevance: z.string().max(600),
  problem_solved: z.string().max(400),
  change: z.string().max(400),
  benefit: z.string().max(400),
  effort: z.string().max(300),
  risks: z.string().max(400),
  check_before: z.string().max(400),
  alternatives: z.array(z.string()),
  do_nothing_consequence: z.string().max(400),
});

export const SignalsConsultedSchema = z.object({
  answers: z.array(z.string()),
  scan_findings: z.array(z.string()),
  vendor_fields: z.array(z.string()),
});

export const ImpactSchema = z.object({
  operational: BandSchema,
  workload_reduction: BandSchema,
  guest_experience: BandSchema,
  response_speed: BandSchema,
  consistency: BandSchema,
  onboarding: BandSchema,
  direct_booking: BandSchema,
  complexity: BandSchema,
  cost_band: z.enum(["free", "entry", "mid", "premium", "enterprise", "variable"]),
  time_to_deploy: z.enum(["immediate", "30d", "60d", "90d", "quarter_plus"]),
  risk_level: BandSchema,
  dependencies: z.array(z.string()),
});

export const RecommendationItemSchema = z.object({
  action: z.string().max(200),
  scenario_kind: z.enum(["minimal", "balanced", "advanced", "standalone"]),
  vendor_id: z.string().nullable().optional(),
  explanation: ExplanationSchema,
  impact: ImpactSchema,
  confidence: BandSchema,
  do_not_do_now: z.boolean(),
  do_not_do_reason: z.string().nullable().optional(),
  signals_consulted: SignalsConsultedSchema,
});

export const ScenarioItemSchema = z.object({
  kind: z.enum(["minimal", "balanced", "advanced"]),
  title: z.string(),
  summary: z.string().max(600),
  tradeoffs: z.record(z.string(), z.unknown()),
});

export const ReadinessScoreSchema = z.object({
  dimension: z.enum([
    "website",
    "ai_search",
    "direct_booking",
    "guest_communication",
    "automation",
    "tool_stack_coherence",
    "data_integration",
    "compliance",
    "operational_workload",
  ]),
  value: z.number().int().min(0).max(100),
  band: BandSchema,
  basis: z.array(z.string()),
});

export const ComplianceFindingSchema = z.object({
  topic: z.string(),
  severity: SeveritySchema,
  explanation: z.string().max(600),
  checklist_item: z.string().max(300),
});

export const ReasonProjectOutputSchema = z.object({
  executive_summary: z.string().max(1200),
  scenarios: z.array(ScenarioItemSchema),
  recommendations: z.array(RecommendationItemSchema),
  readiness_scores: z.array(ReadinessScoreSchema),
  compliance_findings: z.array(ComplianceFindingSchema),
});

export type ReasonProjectOutput = z.infer<typeof ReasonProjectOutputSchema>;

/* ----------------------------- prompt builders ----------------------------- */

/**
 * System message — cached prefix.
 *
 * Per ai-prompts.md: the stable-prefix sections (vendor catalogue snapshot,
 * scoring rubric, question catalogue, system instructions) are marked for
 * prompt caching. Per-project content is the cache-miss tail.
 */
export function buildSystemSegments(args: {
  vendorCatalogueSnapshot: string;
  scoringRubric: string;
  questionCatalogue: string;
}) {
  return [
    {
      type: "text" as const,
      cache: true,
      text: `You are the reasoning layer of a hotel diagnostic platform. Your job is to produce structured recommendations, scenarios, scores, and explanations for an independent-hotel audit, given a vendor catalogue, a scoring rubric, the hotel's answers, and the external scan findings.

You MUST:
- Output only via the provided structured tool. No free-form prose outside the tool call.
- Use only vendor entries from the provided catalogue; never invent vendors.
- Mark a recommendation as do_not_do_now when an action is premature or risky for this hotel, and explain why.
- Set confidence conservatively. Lower confidence whenever a relevant vendor field is marked uncertain or outdated, or when a critical answer is "I don't know".
- Refuse to produce a compliance verdict; describe risk areas and checklist items only.
- Never include the hotelier's personal name, contact email, phone, or named guests in any rendered field — those have already been redacted before reaching you.`,
    },
    {
      type: "text" as const,
      cache: true,
      text: `## Vendor catalogue snapshot\n\n${args.vendorCatalogueSnapshot}`,
    },
    {
      type: "text" as const,
      cache: true,
      text: `## Scoring rubric\n\n${args.scoringRubric}`,
    },
    {
      type: "text" as const,
      cache: true,
      text: `## Question catalogue\n\n${args.questionCatalogue}`,
    },
  ];
}

/**
 * User message — the cache-miss tail. Carries the project-specific context.
 *
 * The shape mirrors the payload documented in ai-prompts.md § P1.
 */
export function buildUserMessage(
  ctx: RecommendationContext,
  ruleOutput: EngineOutput,
): string {
  const payload = {
    hotel_profile: {
      property_type: ctx.hotel.property_type,
      room_count: ctx.hotel.room_count,
      country: ctx.hotel.country,
      region: ctx.hotel.region,
      language: ctx.hotel.primary_language,
      star_rating: ctx.hotel.star_rating,
    },
    goal_primary: ctx.project.goal_primary,
    goal_secondary: ctx.project.goal_secondary,
    budget_level: ctx.project.budget_level,
    scan_findings_summary: ctx.scanFindings.map((f) => ({
      field: f.field,
      value: f.value,
      confidence: f.confidence,
    })),
    answers: ctx.answers.map((a) => ({
      question_slug: a.question_slug,
      question_version_id: a.question_version_id,
      value: a.value,
      source: a.source,
      confidence: a.confidence,
    })),
    eligible_vendors: ctx.vendorCatalogue.map((v) => ({
      id: v.id,
      version_id: v.currentVersionId,
      summary: `${v.slug} (${v.category}) — gdpr=${v.gdprPosture} eu_hosting=${v.euHosting} fr=${v.frenchMarketRelevance}`,
    })),
    rule_engine_version: ruleOutput.rule_engine_version,
    /**
     * Provide the rules-only output so the LLM enriches the explanations
     * rather than producing a parallel reasoning chain. Final shape is
     * merged in `ai.worker.ts`.
     */
    rules_baseline: {
      executive_summary: ruleOutput.executive_summary,
      recommendation_actions: ruleOutput.recommendations.map((r) => ({
        rule_id: r.rule_id,
        action: r.action,
        do_not_do_now: r.do_not_do_now,
      })),
      readiness_scores: ruleOutput.readiness_scores,
    },
  };
  return JSON.stringify(payload, null, 2);
}

/* ----------------------------- merge helper ----------------------------- */

/**
 * Merge LLM-enriched explanations / executive summary back into the
 * rules-only EngineOutput. The LLM never replaces the rule-derived
 * `signals_consulted` enumeration — we intersect (FR-113 + ai-prompts.md
 * post-processing rules).
 */
export function mergeLlmIntoEngine(
  rules: EngineOutput,
  llm: ReasonProjectOutput,
): EngineOutput {
  const next: EngineOutput = { ...rules };
  if (llm.executive_summary?.length) next.executive_summary = llm.executive_summary;

  // Build a quick lookup from rule_id / action -> llm recommendation.
  const llmByAction = new Map<string, ReasonProjectOutput["recommendations"][number]>();
  for (const item of llm.recommendations) llmByAction.set(item.action, item);

  next.recommendations = rules.recommendations.map((r) => {
    const llmItem = llmByAction.get(r.action);
    if (!llmItem) return r;
    // Override min(rules, llm) confidence per ai-prompts.md.
    const order = ["low", "medium", "high"] as const;
    const lower = order[Math.min(order.indexOf(r.confidence), order.indexOf(llmItem.confidence))]!;
    return {
      ...r,
      explanation: llmItem.explanation,
      confidence: lower,
      // Keep signals_consulted as the rule-enumerated set (intersection).
    };
  });

  // Compliance findings: prefer LLM phrasing only if topic matches.
  const ruleTopics = new Set(rules.compliance_findings.map((f) => f.topic));
  next.compliance_findings = rules.compliance_findings.map((rf) => {
    const llmMatch = llm.compliance_findings.find((l) => l.topic === rf.topic);
    if (!llmMatch) return rf;
    return {
      ...rf,
      explanation: llmMatch.explanation,
      checklist_item: llmMatch.checklist_item,
    };
  });
  // Add LLM findings for topics rules didn't already cover.
  for (const lf of llm.compliance_findings) {
    if (!ruleTopics.has(lf.topic)) {
      next.compliance_findings.push({
        topic: lf.topic,
        severity: lf.severity,
        explanation: lf.explanation,
        checklist_item: lf.checklist_item,
        vendor_id: null,
      });
    }
  }

  return next;
}
