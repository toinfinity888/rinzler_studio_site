/**
 * T072 — Roadmap generator.
 *
 * Buckets recommendations into immediate / 30d / 60d / 90d / postponed /
 * not_now using rule-based ordering:
 *
 *  - do_not_do_now=true  → not_now
 *  - time_to_deploy=immediate AND effort=low   → immediate
 *  - time_to_deploy=30d OR (low effort + high impact) → 30d
 *  - time_to_deploy=60d → 60d
 *  - time_to_deploy=90d → 90d
 *  - time_to_deploy=quarter_plus → postponed
 */
import type {
  RoadmapItemOutput,
  RuleRecommendation,
  Band,
} from "./types";

function bucketFor(r: RuleRecommendation): RoadmapItemOutput["bucket"] {
  if (r.do_not_do_now) return "not_now";
  switch (r.impact.time_to_deploy) {
    case "immediate":
      return "immediate";
    case "30d":
      return "30d";
    case "60d":
      return "60d";
    case "90d":
      return "90d";
    case "quarter_plus":
      return "postponed";
    default:
      return "postponed";
  }
}

function effortMapping(level: Band): Band {
  return level;
}

function impactMapping(level: Band): Band {
  return level;
}

export function generateRoadmap(
  recommendations: RuleRecommendation[],
): RoadmapItemOutput[] {
  return recommendations.map((r) => ({
    recommendation_id: r.id,
    bucket: bucketFor(r),
    expected_effort: effortMapping(r.expected_effort),
    expected_impact: impactMapping(r.expected_impact),
    dependencies: r.dependencies,
    recommended_owner: r.recommended_owner,
    implementation_risk: r.impact.risk_level,
    decision_points: r.do_not_do_now
      ? [
          {
            when: "trimestriel",
            question: r.do_not_do_reason ?? "Re-évaluer le contexte ce trimestre",
            resolution_options: ["maintenir le report", "réactiver", "réviser"],
          },
        ]
      : [],
  }));
}
