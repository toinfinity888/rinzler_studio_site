/**
 * Shared types for report components.
 *
 * Mirrors `contracts/report-export.schema.json`. The rendered_json is the
 * source of truth — components consume it directly. Snapshots are frozen
 * (FR-094) so types here are the public contract for every published
 * report, forever.
 */

export type Band = "low" | "medium" | "high";
export type Severity = "info" | "advisory" | "risk" | "opportunity";
export type Bucket = "immediate" | "thirty_day" | "sixty_day" | "ninety_day" | "postponed";

export interface ReportRendered {
  schema_version: string;
  project: {
    id: string;
    hotel_id: string | null;
    tier: string;
    language: string;
    published_at: string;
    goal_primary: string;
    goal_secondary?: string[];
  };
  executive_summary: string;
  readiness_scores: Array<{
    dimension: string;
    value: number;
    band: Band;
    basis?: string[];
  }>;
  opportunity_map: Array<{
    category: string;
    headline: string;
    detail?: string;
    severity: Severity;
  }>;
  bottleneck_analysis: Array<{
    bottleneck: string;
    description: string;
    evidence?: string[];
  }>;
  tool_stack_overview: {
    current?: Array<Record<string, unknown>>;
    missing?: string[];
    redundant?: string[];
  };
  scenarios: Array<{
    kind: string;
    title: string;
    summary: string;
    tradeoffs: Record<string, unknown>;
    recommendation_ids: string[];
  }>;
  recommendations: Array<{
    id: string;
    action: string;
    vendor: { id: string; version_id: string; name: string; category: string } | null;
    explanation: {
      relevance: string;
      problem_solved: string;
      change: string;
      benefit: string;
      effort: string;
      risks: string;
      check_before: string;
      alternatives: string[];
      do_nothing_consequence: string;
    };
    impact: Record<string, unknown>;
    confidence: Band;
    do_not_do_now: boolean;
    do_not_do_reason: string | null;
    signals_consulted: { answers: string[]; scan_findings: string[]; vendor_fields: string[] };
  }>;
  tool_shortlist: Array<{
    vendor_id: string;
    vendor_version_id: string;
    name: string;
    category?: string;
    reason: string;
    confidence: Band;
  }>;
  what_not_to_do_now: Array<{
    action: string;
    reason: string;
    reconsider_when?: string;
  }>;
  impact_analysis: Array<{
    recommendation_id: string;
    dimensions: Record<string, unknown>;
  }>;
  roadmap: Record<Bucket, Array<{
    recommendation_id: string;
    expected_effort: Band;
    expected_impact: Band;
    dependencies?: string[];
    recommended_owner?: string;
    implementation_risk?: Band;
    decision_points?: unknown[];
  }>>;
  compliance_checklist: Array<{
    topic: string;
    severity: Severity;
    explanation: string;
    checklist_item: string;
  }>;
  next_steps: string[];
  metadata: {
    rule_engine_version: string;
    scoring_rubric_version?: string;
    referenced_vendor_versions: string[];
    referenced_question_versions: string[];
    disclaimer?: string;
  };
}

export const BAND_COLOR: Record<Band, string> = {
  low: "text-error",
  medium: "text-warning",
  high: "text-success",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  info: "text-text-secondary",
  opportunity: "text-accent-cyan",
  advisory: "text-warning",
  risk: "text-error",
};

export const DIMENSION_LABEL: Record<string, string> = {
  website: "Site & SEO",
  ai_search: "Visibilité IA",
  direct_booking: "Réservation directe",
  guest_communication: "Communication client",
  automation: "Automatisation",
  tool_stack_coherence: "Cohérence stack",
  data_integration: "Données & intégration",
  compliance: "Conformité",
  operational_workload: "Charge opérationnelle",
};
