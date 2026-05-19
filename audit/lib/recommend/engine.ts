/**
 * T072 — Engine orchestrator.
 *
 * The single entrypoint into the rules-only recommendation pipeline.
 *
 *    runEngine(ctx) → EngineOutput
 *
 * The shape of EngineOutput matches the Bedrock tool-use shape in
 * `contracts/ai-prompts.md` P1, so when Bedrock unlocks we swap the producer
 * (or merge LLM-enriched explanations on top) without changing the consumer.
 */
import type {
  EngineOutput,
  RecommendationContext,
  RuleRecommendation,
} from "./types";
import { RULE_ENGINE_VERSION } from "./types";

import { generatePositiveRecommendations } from "./rules/recommendations";
import { generateExclusions } from "./rules/exclusions";
import { generateComplianceFindings } from "./rules/compliance";
import { computeReadinessScores } from "./score-calculator";
import { buildScenarios } from "./scenario-builder";
import { generateRoadmap } from "./roadmap-generator";
import {
  type EligibilityResult,
  findEligibleVendors,
} from "./rules/eligibility";

/* ----------------------------- helpers ----------------------------- */

function buildExecutiveSummary(
  ctx: RecommendationContext,
  positives: RuleRecommendation[],
  exclusions: RuleRecommendation[],
): string {
  const top = positives.slice(0, 3).map((r) => r.action);
  const goal = ctx.project.goal_primary ?? "modernisation digitale";
  const rooms = ctx.hotel.room_count ?? "—";
  const propType = ctx.hotel.property_type ?? "hôtel";
  const summary = [
    `Audit pour un ${propType} de ${rooms} chambres avec objectif principal ${goal}.`,
    `Top priorités identifiées : ${top.length ? top.join(" · ") : "consolidation des fondamentaux."}`,
    `Actions explicitement déconseillées ce trimestre : ${exclusions.length}.`,
    `Score de cohérence stack ${ctx.answersByslug["pms_vendor"] ?? "—"} ; goal secondaire(s) : ${(ctx.project.goal_secondary ?? []).join(", ") || "—"}.`,
  ].join(" ");
  return summary.slice(0, 1180); // contract max 1200 chars
}

function buildOpportunityMap(ctx: RecommendationContext) {
  const out: EngineOutput["opportunity_map"] = [];
  if (ctx.scanByField["schema_hotel_present"] === false) {
    out.push({
      category: "ai_search",
      headline: "Pas de balisage schema.org Hotel détecté",
      detail:
        "Sans schéma Hotel, votre établissement reste invisible des moteurs AI-driven et de la recherche guidée par Google.",
      severity: "opportunity",
    });
  }
  if (ctx.scanByField["booking_button_target"] === "external") {
    out.push({
      category: "direct_booking",
      headline: "Le bouton 'Réserver' redirige hors-site",
      detail: "Chaque conversion via ce bouton coûte une commission OTA.",
      severity: "risk",
    });
  }
  if (ctx.scanByField["whatsapp_visible"] === false) {
    out.push({
      category: "guest_communication",
      headline: "WhatsApp non visible sur le site",
      severity: "info",
    });
  }
  if (ctx.scanByField["faq_present"] === false) {
    out.push({
      category: "guest_communication",
      headline: "Pas de FAQ structurée détectée",
      detail: "Une FAQ couvre 70 % des questions guest répétitives.",
      severity: "opportunity",
    });
  }
  const perf = ctx.scanByField["lighthouse_performance_mobile"];
  if (typeof perf === "number" && perf < 60) {
    out.push({
      category: "website",
      headline: `Score performance mobile bas (${perf}/100)`,
      detail:
        "Une page lente sur mobile pèse directement sur la conversion et le ranking moteurs.",
      severity: "risk",
    });
  }
  if (out.length === 0) {
    out.push({
      category: "general",
      headline: "Présence digitale de base solide — opportunités à approfondir via le questionnaire",
      severity: "info",
    });
  }
  return out;
}

function buildBottleneckAnalysis(ctx: RecommendationContext) {
  const out: EngineOutput["bottleneck_analysis"] = [];
  const pressure = ctx.answersByslug["operational_workload_pressure"];
  if (typeof pressure === "number" && pressure >= 4) {
    out.push({
      bottleneck: "Charge opérationnelle élevée à la réception",
      description:
        "L'équipe absorbe une charge de communication guest qui empêche d'agir sur les chantiers structurants.",
      evidence: ["answer:operational_workload_pressure"],
    });
  }
  if (ctx.answersByslug["has_knowledge_base"] === "no") {
    out.push({
      bottleneck: "Pas de base de connaissances structurée",
      description:
        "L'information est tribale; chaque nouvelle personne au desk doit ré-apprendre les mêmes choses.",
      evidence: ["answer:has_knowledge_base"],
    });
  }
  const comfort = ctx.answersByslug["staff_tool_comfort"];
  if (typeof comfort === "number" && comfort <= 2) {
    out.push({
      bottleneck: "Confort outils de l'équipe faible",
      description:
        "Les outils existants sont sous-utilisés — toute nouvelle automatisation rebondira sans formation préalable.",
      evidence: ["answer:staff_tool_comfort"],
    });
  }
  if (ctx.scanByField["booking_button_target"] === "external") {
    out.push({
      bottleneck: "Fuite de marge vers les OTA",
      description:
        "Le bouton de réservation principal n'est pas direct — chaque réservation paie une commission évitable.",
      evidence: ["scan:booking_button_target"],
    });
  }
  return out;
}

function buildToolStackOverview(ctx: RecommendationContext) {
  const current: EngineOutput["tool_stack_overview"]["current"] = [];
  const declaredPms = ctx.answersByslug["pms_vendor"];
  if (declaredPms && declaredPms !== "none") {
    current.push({
      category: "pms",
      vendor: typeof declaredPms === "string" ? declaredPms : null,
      confidence: ctx.answerConfidence["pms_vendor"] ?? "medium",
    });
  }
  const detectedBe = ctx.scanByField["vendor_booking_engine"];
  if (typeof detectedBe === "string") {
    current.push({
      category: "booking_engine",
      vendor: detectedBe,
      confidence: "medium",
    });
  }
  const missing: string[] = [];
  if (
    ctx.answersByslug["has_knowledge_base"] === "no" ||
    ctx.answersByslug["has_knowledge_base"] === false
  ) {
    missing.push("knowledge_base");
  }
  if (ctx.scanByField["faq_present"] === false) {
    missing.push("public_faq");
  }
  if (ctx.scanByField["whatsapp_visible"] === false && !ctx.answersByslug["uses_whatsapp"]) {
    missing.push("guest_messaging");
  }
  return { current, missing, redundant: [] };
}

function buildNextSteps(positives: RuleRecommendation[]): string[] {
  return positives
    .slice(0, 3)
    .map(
      (r, i) =>
        `${i + 1}. ${r.action} (effort: ${r.expected_effort}, impact attendu: ${r.expected_impact})`,
    );
}

function lowerConfidenceForUnknownGdpr(
  recs: RuleRecommendation[],
  ctx: RecommendationContext,
): RuleRecommendation[] {
  // FR-053: when a recommendation's vendor has unknown GDPR posture, lower
  // its confidence one step.
  return recs.map((r) => {
    if (!r.vendor_id) return r;
    const vendor = ctx.vendorCatalogue.find((v) => v.id === r.vendor_id);
    if (!vendor) return r;
    if (vendor.gdprPosture === "unknown" || vendor.euHosting === "unknown") {
      const lowered =
        r.confidence === "high" ? "medium" : r.confidence === "medium" ? "low" : "low";
      return {
        ...r,
        confidence: lowered,
        signals_consulted: {
          ...r.signals_consulted,
          vendor_fields: Array.from(
            new Set([...r.signals_consulted.vendor_fields, "gdprPosture", "euHosting"]),
          ),
        },
      };
    }
    return r;
  });
}

function sortByPriority(a: RuleRecommendation, b: RuleRecommendation): number {
  return a.priority - b.priority;
}

/* ----------------------------- runEngine ----------------------------- */

export interface RunEngineOptions {
  /** Optional: override the rule engine version for tests. */
  ruleEngineVersionOverride?: string;
}

export function runEngine(
  ctx: RecommendationContext,
  options: RunEngineOptions = {},
): EngineOutput {
  // 1) Eligibility pre-filter (used by some recommendation rules).
  const eligibility: EligibilityResult[] = findEligibleVendors(ctx);
  void eligibility; // used internally by rules already; reserved for future selection.

  // 2) Recommendations: positives + exclusions.
  const positivesRaw = generatePositiveRecommendations(ctx);
  const positives = lowerConfidenceForUnknownGdpr(positivesRaw, ctx).sort(sortByPriority);
  const exclusions = generateExclusions(ctx).sort(sortByPriority);

  // 3) Scenarios.
  const { scenarios } = buildScenarios(positives);

  // 4) Scores.
  const readinessScores = computeReadinessScores(ctx);

  // 5) Compliance.
  const complianceFindings = generateComplianceFindings(ctx);

  // 6) Roadmap.
  const roadmap = generateRoadmap([...positives, ...exclusions]);

  // 7) Opportunity map + bottlenecks + tool stack overview.
  const opportunity = buildOpportunityMap(ctx);
  const bottleneck = buildBottleneckAnalysis(ctx);
  const stack = buildToolStackOverview(ctx);

  const recommendations = [...positives, ...exclusions];

  // 8) Executive summary + next steps.
  const execSummary = buildExecutiveSummary(ctx, positives, exclusions);
  const nextSteps = buildNextSteps(positives);

  // 9) Referenced vendor versions for the snapshot pin.
  const referencedVendorVersionIds = Array.from(
    new Set(
      recommendations
        .map((r) => r.vendor_version_id)
        .filter((v): v is string => typeof v === "string"),
    ),
  );

  return {
    executive_summary: execSummary,
    scenarios,
    recommendations,
    readiness_scores: readinessScores,
    compliance_findings: complianceFindings,
    opportunity_map: opportunity,
    bottleneck_analysis: bottleneck,
    tool_stack_overview: stack,
    roadmap_items: roadmap,
    next_steps: nextSteps,
    rule_engine_version: options.ruleEngineVersionOverride ?? RULE_ENGINE_VERSION,
    referenced_vendor_version_ids: referencedVendorVersionIds,
  };
}

/** Helper exposed for the worker — build context from raw DB rows. */
export function buildContext(args: {
  project: import("./types").ProjectSnapshot;
  hotel: import("./types").HotelSnapshot;
  answers: import("./types").AnswerInput[];
  scanFindings: import("./types").ScanFindingInput[];
  vendorCatalogue: import("./types").VendorCatalogueEntry[];
}): RecommendationContext {
  const answersByslug: Record<string, unknown> = {};
  const answerConfidence: Record<string, string> = {};
  for (const a of args.answers) {
    answersByslug[a.question_slug] = a.value;
    answerConfidence[a.question_slug] = a.confidence;
  }
  const scanByField: Record<string, unknown> = {};
  for (const f of args.scanFindings) scanByField[f.field] = f.value;
  return {
    project: args.project,
    hotel: args.hotel,
    answers: args.answers,
    answersByslug,
    answerConfidence,
    scanFindings: args.scanFindings,
    scanByField,
    vendorCatalogue: args.vendorCatalogue,
  };
}
