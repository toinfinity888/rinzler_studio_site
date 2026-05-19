/**
 * T075 — Report snapshot builder.
 *
 * Consumes the EngineOutput + the project context and produces the immutable
 * `report_snapshots.rendered_json` payload conforming to
 * `contracts/report-export.schema.json`. Pin participating
 * vendor/question/rule versions (FR-094 / SC-020).
 */
import type {
  EngineOutput,
  ProjectSnapshot,
  HotelSnapshot,
} from "@/lib/recommend/types";

export const REPORT_SCHEMA_VERSION = "hotel-diagnostic-report.v1";

export interface BuildSnapshotArgs {
  project: ProjectSnapshot & { id: string; language: string; hotel_id: string | null };
  hotel: HotelSnapshot;
  engine: EngineOutput;
  referencedQuestionVersionIds: string[];
  publishedAt: Date;
  scoringRubricVersion?: string;
}

export interface BuildSnapshotResult {
  renderedJson: Record<string, unknown>;
  referencedVendorVersionIds: string[];
  referencedQuestionVersionIds: string[];
  ruleEngineVersion: string;
}

/**
 * Maps the engine output into the canonical report-export shape.
 */
export function buildSnapshot(args: BuildSnapshotArgs): BuildSnapshotResult {
  const e = args.engine;

  const recommendationsBlock = e.recommendations.map((r) => ({
    id: r.id,
    action: r.action,
    vendor: r.vendor_id
      ? {
          id: r.vendor_id,
          version_id: r.vendor_version_id ?? r.vendor_id,
          name: r.vendor_name ?? r.vendor_id,
          category: r.vendor_category ?? "",
        }
      : null,
    explanation: r.explanation,
    impact: r.impact,
    confidence: r.confidence,
    do_not_do_now: r.do_not_do_now,
    do_not_do_reason: r.do_not_do_reason,
    signals_consulted: r.signals_consulted,
  }));

  const scenarios = e.scenarios.map((s) => ({
    kind: s.kind,
    title: s.title,
    summary: s.summary,
    tradeoffs: s.tradeoffs,
    recommendation_ids: s.recommendation_ids,
  }));

  const toolShortlist = e.recommendations
    .filter((r) => r.vendor_id && !r.do_not_do_now)
    .map((r) => ({
      vendor_id: r.vendor_id!,
      vendor_version_id: r.vendor_version_id ?? r.vendor_id!,
      name: r.vendor_name ?? "",
      category: r.vendor_category ?? "",
      reason: r.explanation.relevance,
      confidence: r.confidence,
    }));

  const exclusions = e.recommendations
    .filter((r) => r.do_not_do_now)
    .map((r) => ({
      action: r.action,
      reason: r.do_not_do_reason ?? r.explanation.relevance,
      reconsider_when: r.explanation.check_before,
    }));

  // Ensure FR-033: at least one entry in what_not_to_do_now (SC-007).
  if (exclusions.length === 0) {
    exclusions.push({
      action: "Empiler des outils complémentaires sans avoir traité les fondamentaux",
      reason:
        "Aucune exclusion explicite ne ressort de votre profil — gardez la discipline de finir les chantiers en cours avant d'en ouvrir de nouveaux.",
      reconsider_when: "Quand les actions du scénario A sont en production depuis 60 jours.",
    });
  }

  const impactAnalysis = e.recommendations.map((r) => ({
    recommendation_id: r.id,
    dimensions: {
      operational: r.impact.operational,
      workload_reduction: r.impact.workload_reduction,
      guest_experience: r.impact.guest_experience,
      response_speed: r.impact.response_speed,
      consistency: r.impact.consistency,
      onboarding: r.impact.onboarding,
      direct_booking: r.impact.direct_booking,
      complexity: r.impact.complexity,
      cost_band: r.impact.cost_band,
      time_to_deploy: r.impact.time_to_deploy,
      risk_level: r.impact.risk_level,
      dependencies: r.impact.dependencies,
      confidence: r.impact.confidence,
    },
  }));

  const roadmap = {
    immediate: e.roadmap_items
      .filter((i) => i.bucket === "immediate")
      .map((i) => ({
        recommendation_id: i.recommendation_id,
        expected_effort: i.expected_effort,
        expected_impact: i.expected_impact,
        dependencies: i.dependencies,
        recommended_owner: i.recommended_owner,
        implementation_risk: i.implementation_risk,
        decision_points: i.decision_points,
      })),
    thirty_day: e.roadmap_items
      .filter((i) => i.bucket === "30d")
      .map((i) => ({
        recommendation_id: i.recommendation_id,
        expected_effort: i.expected_effort,
        expected_impact: i.expected_impact,
        dependencies: i.dependencies,
        recommended_owner: i.recommended_owner,
        implementation_risk: i.implementation_risk,
        decision_points: i.decision_points,
      })),
    sixty_day: e.roadmap_items
      .filter((i) => i.bucket === "60d")
      .map((i) => ({
        recommendation_id: i.recommendation_id,
        expected_effort: i.expected_effort,
        expected_impact: i.expected_impact,
        dependencies: i.dependencies,
        recommended_owner: i.recommended_owner,
        implementation_risk: i.implementation_risk,
        decision_points: i.decision_points,
      })),
    ninety_day: e.roadmap_items
      .filter((i) => i.bucket === "90d")
      .map((i) => ({
        recommendation_id: i.recommendation_id,
        expected_effort: i.expected_effort,
        expected_impact: i.expected_impact,
        dependencies: i.dependencies,
        recommended_owner: i.recommended_owner,
        implementation_risk: i.implementation_risk,
        decision_points: i.decision_points,
      })),
    postponed: e.roadmap_items
      .filter((i) => i.bucket === "postponed" || i.bucket === "not_now")
      .map((i) => ({
        recommendation_id: i.recommendation_id,
        expected_effort: i.expected_effort,
        expected_impact: i.expected_impact,
        dependencies: i.dependencies,
        recommended_owner: i.recommended_owner,
        implementation_risk: i.implementation_risk,
        decision_points: i.decision_points,
      })),
  };

  const renderedJson: Record<string, unknown> = {
    schema_version: REPORT_SCHEMA_VERSION,
    project: {
      id: args.project.id,
      hotel_id: args.project.hotel_id,
      tier: args.project.tier === "free_scan" ? "mini" : args.project.tier,
      language: args.project.language,
      published_at: args.publishedAt.toISOString(),
      goal_primary: args.project.goal_primary ?? "modernize",
      goal_secondary: args.project.goal_secondary ?? [],
    },
    executive_summary: e.executive_summary,
    readiness_scores: e.readiness_scores.map((s) => ({
      dimension: s.dimension,
      value: s.value,
      band: s.band,
      basis: s.basis,
    })),
    opportunity_map: e.opportunity_map,
    bottleneck_analysis: e.bottleneck_analysis,
    tool_stack_overview: e.tool_stack_overview,
    scenarios,
    recommendations: recommendationsBlock,
    tool_shortlist: toolShortlist,
    what_not_to_do_now: exclusions,
    impact_analysis: impactAnalysis,
    roadmap,
    compliance_checklist: e.compliance_findings.map((c) => ({
      topic: c.topic,
      severity: c.severity,
      explanation: c.explanation,
      checklist_item: c.checklist_item,
    })),
    next_steps: e.next_steps,
    metadata: {
      rule_engine_version: e.rule_engine_version,
      scoring_rubric_version: args.scoringRubricVersion ?? "v1.0.0",
      referenced_vendor_versions: e.referenced_vendor_version_ids,
      referenced_question_versions: args.referencedQuestionVersionIds,
      disclaimer:
        "Ce rapport est une analyse de décision fournie par Rinzler Studio. Il ne constitue pas un conseil juridique. Les recommandations vendor reflètent l'état du catalogue à la date de publication.",
    },
  };

  return {
    renderedJson,
    referencedVendorVersionIds: e.referenced_vendor_version_ids,
    referencedQuestionVersionIds: args.referencedQuestionVersionIds,
    ruleEngineVersion: e.rule_engine_version,
  };
}
