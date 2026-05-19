/**
 * T071 — Impact estimator.
 *
 * Produces the 13 impact dimensions from FR-040 as qualitative bands for a
 * given recommendation archetype. The archetype string is owned by the rule
 * that produced the recommendation; this module maps archetype + context to
 * the impact shape so the same archetype generates consistent estimates
 * across audits.
 */
import type { ImpactShape, RecommendationContext } from "./types";

export type RecommendationArchetype =
  | "knowledge_base"
  | "guest_messaging_tool"
  | "response_templates"
  | "schema_markup"
  | "faq_page"
  | "booking_engine_swap"
  | "crm_introduction"
  | "channel_manager"
  | "pms_evaluation"
  | "website_revamp"
  | "ai_concierge"
  | "review_management"
  | "whatsapp_setup"
  | "ai_transparency_notice"
  | "dpa_review"
  | "training";

interface ImpactBaseline {
  operational: ImpactShape["operational"];
  workload_reduction: ImpactShape["workload_reduction"];
  guest_experience: ImpactShape["guest_experience"];
  response_speed: ImpactShape["response_speed"];
  consistency: ImpactShape["consistency"];
  onboarding: ImpactShape["onboarding"];
  direct_booking: ImpactShape["direct_booking"];
  complexity: ImpactShape["complexity"];
  cost_band: ImpactShape["cost_band"];
  time_to_deploy: ImpactShape["time_to_deploy"];
  risk_level: ImpactShape["risk_level"];
}

const BASELINE: Record<RecommendationArchetype, ImpactBaseline> = {
  knowledge_base: {
    operational: "high",
    workload_reduction: "high",
    guest_experience: "high",
    response_speed: "high",
    consistency: "high",
    onboarding: "high",
    direct_booking: "low",
    complexity: "low",
    cost_band: "free",
    time_to_deploy: "30d",
    risk_level: "low",
  },
  guest_messaging_tool: {
    operational: "high",
    workload_reduction: "high",
    guest_experience: "high",
    response_speed: "high",
    consistency: "medium",
    onboarding: "medium",
    direct_booking: "low",
    complexity: "medium",
    cost_band: "entry",
    time_to_deploy: "30d",
    risk_level: "low",
  },
  response_templates: {
    operational: "medium",
    workload_reduction: "medium",
    guest_experience: "medium",
    response_speed: "high",
    consistency: "high",
    onboarding: "high",
    direct_booking: "low",
    complexity: "low",
    cost_band: "free",
    time_to_deploy: "immediate",
    risk_level: "low",
  },
  schema_markup: {
    operational: "low",
    workload_reduction: "low",
    guest_experience: "low",
    response_speed: "low",
    consistency: "low",
    onboarding: "low",
    direct_booking: "medium",
    complexity: "low",
    cost_band: "free",
    time_to_deploy: "immediate",
    risk_level: "low",
  },
  faq_page: {
    operational: "medium",
    workload_reduction: "medium",
    guest_experience: "medium",
    response_speed: "medium",
    consistency: "high",
    onboarding: "medium",
    direct_booking: "low",
    complexity: "low",
    cost_band: "free",
    time_to_deploy: "30d",
    risk_level: "low",
  },
  booking_engine_swap: {
    operational: "medium",
    workload_reduction: "low",
    guest_experience: "medium",
    response_speed: "low",
    consistency: "medium",
    onboarding: "medium",
    direct_booking: "high",
    complexity: "high",
    cost_band: "mid",
    time_to_deploy: "60d",
    risk_level: "medium",
  },
  crm_introduction: {
    operational: "medium",
    workload_reduction: "low",
    guest_experience: "medium",
    response_speed: "medium",
    consistency: "medium",
    onboarding: "low",
    direct_booking: "medium",
    complexity: "medium",
    cost_band: "entry",
    time_to_deploy: "60d",
    risk_level: "medium",
  },
  channel_manager: {
    operational: "high",
    workload_reduction: "medium",
    guest_experience: "low",
    response_speed: "low",
    consistency: "high",
    onboarding: "low",
    direct_booking: "medium",
    complexity: "medium",
    cost_band: "entry",
    time_to_deploy: "60d",
    risk_level: "medium",
  },
  pms_evaluation: {
    operational: "high",
    workload_reduction: "medium",
    guest_experience: "low",
    response_speed: "low",
    consistency: "high",
    onboarding: "medium",
    direct_booking: "medium",
    complexity: "high",
    cost_band: "premium",
    time_to_deploy: "90d",
    risk_level: "high",
  },
  website_revamp: {
    operational: "low",
    workload_reduction: "low",
    guest_experience: "high",
    response_speed: "low",
    consistency: "medium",
    onboarding: "low",
    direct_booking: "high",
    complexity: "high",
    cost_band: "mid",
    time_to_deploy: "60d",
    risk_level: "medium",
  },
  ai_concierge: {
    operational: "medium",
    workload_reduction: "high",
    guest_experience: "high",
    response_speed: "high",
    consistency: "medium",
    onboarding: "medium",
    direct_booking: "low",
    complexity: "high",
    cost_band: "mid",
    time_to_deploy: "60d",
    risk_level: "high",
  },
  review_management: {
    operational: "medium",
    workload_reduction: "medium",
    guest_experience: "high",
    response_speed: "medium",
    consistency: "medium",
    onboarding: "low",
    direct_booking: "low",
    complexity: "low",
    cost_band: "entry",
    time_to_deploy: "30d",
    risk_level: "low",
  },
  whatsapp_setup: {
    operational: "medium",
    workload_reduction: "medium",
    guest_experience: "high",
    response_speed: "high",
    consistency: "low",
    onboarding: "medium",
    direct_booking: "medium",
    complexity: "low",
    cost_band: "free",
    time_to_deploy: "30d",
    risk_level: "low",
  },
  ai_transparency_notice: {
    operational: "low",
    workload_reduction: "low",
    guest_experience: "low",
    response_speed: "low",
    consistency: "high",
    onboarding: "low",
    direct_booking: "low",
    complexity: "low",
    cost_band: "free",
    time_to_deploy: "immediate",
    risk_level: "low",
  },
  dpa_review: {
    operational: "low",
    workload_reduction: "low",
    guest_experience: "low",
    response_speed: "low",
    consistency: "medium",
    onboarding: "low",
    direct_booking: "low",
    complexity: "medium",
    cost_band: "free",
    time_to_deploy: "30d",
    risk_level: "low",
  },
  training: {
    operational: "high",
    workload_reduction: "medium",
    guest_experience: "medium",
    response_speed: "medium",
    consistency: "high",
    onboarding: "high",
    direct_booking: "low",
    complexity: "low",
    cost_band: "entry",
    time_to_deploy: "60d",
    risk_level: "low",
  },
};

export function estimateImpact(
  archetype: RecommendationArchetype,
  ctx: RecommendationContext,
  overrides?: Partial<ImpactShape>,
): ImpactShape {
  const baseline = BASELINE[archetype];
  // Confidence baseline: medium. Drop to low if many "I don't know" answers
  // shaped the recommendation; raise to high when the related signals are
  // strong.
  const lowConfidenceShare =
    Object.values(ctx.answerConfidence).filter((c) => c === "low").length /
    Math.max(1, Object.keys(ctx.answerConfidence).length);
  const baseConfidence: ImpactShape["confidence"] =
    lowConfidenceShare > 0.3 ? "low" : lowConfidenceShare > 0.1 ? "medium" : "high";

  return {
    operational: baseline.operational,
    workload_reduction: baseline.workload_reduction,
    guest_experience: baseline.guest_experience,
    response_speed: baseline.response_speed,
    consistency: baseline.consistency,
    onboarding: baseline.onboarding,
    direct_booking: baseline.direct_booking,
    complexity: baseline.complexity,
    cost_band: baseline.cost_band,
    time_to_deploy: baseline.time_to_deploy,
    risk_level: baseline.risk_level,
    dependencies: [],
    confidence: baseConfidence,
    ...overrides,
  };
}
