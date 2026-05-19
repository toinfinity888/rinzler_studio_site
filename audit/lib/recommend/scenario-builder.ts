/**
 * T070 — Scenario builder.
 *
 * Groups recommendations into minimal / balanced / advanced scenarios with
 * explicit per-scenario trade-offs (cost / complexity / dependency).
 *
 * Selection logic:
 *  - minimal: the recommendations with scenario_kind 'minimal' or 'standalone'
 *  - balanced: minimal ∪ scenario_kind 'balanced'
 *  - advanced: minimal ∪ balanced ∪ scenario_kind 'advanced'
 *
 * Trade-offs are summarized from the underlying impact + effort distribution.
 */
import { randomUUID } from "node:crypto";

import type { RuleRecommendation, RuleScenario } from "./types";

function countBands(
  recs: RuleRecommendation[],
  field: "expected_effort" | "expected_impact",
): { low: number; medium: number; high: number } {
  const out = { low: 0, medium: 0, high: 0 };
  for (const r of recs) out[r[field]] += 1;
  return out;
}

function buildScenario(
  kind: "minimal" | "balanced" | "advanced",
  recs: RuleRecommendation[],
): RuleScenario {
  const effort = countBands(recs, "expected_effort");
  const impact = countBands(recs, "expected_impact");
  const titles: Record<typeof kind, string> = {
    minimal: "Scénario A — Minimal change",
    balanced: "Scénario B — Balanced upgrade",
    advanced: "Scénario C — Advanced modernization",
  };
  const summaries: Record<typeof kind, string> = {
    minimal:
      "Quick wins à coût nul ou bas; renforcement des fondamentaux (base de connaissances, modèles de réponse, schéma).",
    balanced:
      "Ajoute un outil structurant (messagerie guest ou review management) tout en consolidant les fondamentaux.",
    advanced:
      "Inclut des chantiers de fond (audit distribution, évaluation PMS, refonte web) — réservé si budget + change appetite sont alignés.",
  };
  return {
    id: randomUUID(),
    kind,
    title: titles[kind],
    summary: summaries[kind],
    tradeoffs: {
      effort_low: String(effort.low),
      effort_medium: String(effort.medium),
      effort_high: String(effort.high),
      impact_low: String(impact.low),
      impact_medium: String(impact.medium),
      impact_high: String(impact.high),
      cost_summary:
        kind === "minimal"
          ? "Quasi-nul à faible"
          : kind === "balanced"
            ? "Faible à moyen (subscription d'un outil)"
            : "Moyen à élevé (consultant + outils)",
      complexity_summary:
        kind === "minimal" ? "low" : kind === "balanced" ? "medium" : "high",
    },
    recommendation_ids: recs.map((r) => r.id),
  };
}

export interface ScenarioPlan {
  scenarios: RuleScenario[];
  by_scenario: Record<string, RuleRecommendation[]>;
}

export function buildScenarios(
  positiveRecommendations: RuleRecommendation[],
): ScenarioPlan {
  const minimalRecs = positiveRecommendations.filter(
    (r) => r.scenario_kind === "minimal" || r.scenario_kind === "standalone",
  );
  const balancedAdds = positiveRecommendations.filter((r) => r.scenario_kind === "balanced");
  const advancedAdds = positiveRecommendations.filter((r) => r.scenario_kind === "advanced");

  const minimal = minimalRecs;
  const balanced = [...minimalRecs, ...balancedAdds];
  const advanced = [...balanced, ...advancedAdds];

  const sMinimal = buildScenario("minimal", minimal);
  const sBalanced = buildScenario("balanced", balanced);
  const sAdvanced = buildScenario("advanced", advanced);

  return {
    scenarios: [sMinimal, sBalanced, sAdvanced],
    by_scenario: {
      [sMinimal.id]: minimal,
      [sBalanced.id]: balanced,
      [sAdvanced.id]: advanced,
    },
  };
}
