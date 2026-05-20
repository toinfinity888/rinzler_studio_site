"use client";

import * as React from "react";

/**
 * `ScenarioSideBySide` (T091) — toggle between two scenarios so the
 * consultant can compare them live in front of the hotelier (FR-072 /
 * acceptance scenario 5).
 *
 * Pure client component: takes the array of scenarios surfaced by the
 * current engine output and renders two columns. The "compare" UI is the
 * pragmatic minimum — pick any two scenarios from the dropdowns and the
 * grid below shows their cross-recommendation trade-offs side-by-side.
 *
 * For "what-if recompute," we deliberately keep the existing scenarios
 * snapshot as the source of truth — the worker recomputes after every
 * override, so the consultant always sees the current scenarios.
 */
export interface ScenarioColumn {
  id: string;
  kind: string;
  title: string;
  summary: string;
  tradeoffs: Record<string, unknown>;
  recommendationCount: number;
}

const DIMENSION_LABELS: Record<string, string> = {
  impact: "Impact",
  cost: "Coût",
  complexity: "Complexité",
  time_to_deploy: "Délai",
  risk: "Risque",
  dependencies: "Dépendances",
};

function renderTradeoff(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ") || "—";
  return JSON.stringify(value).slice(0, 80);
}

export function ScenarioSideBySide({ scenarios }: { scenarios: ScenarioColumn[] }) {
  const [leftId, setLeftId] = React.useState<string>(scenarios[0]?.id ?? "");
  const [rightId, setRightId] = React.useState<string>(
    scenarios[1]?.id ?? scenarios[0]?.id ?? "",
  );

  const left = scenarios.find((s) => s.id === leftId) ?? scenarios[0];
  const right = scenarios.find((s) => s.id === rightId) ?? scenarios[1] ?? scenarios[0];

  if (scenarios.length === 0) {
    return (
      <p className="text-sm text-text-muted italic">
        Aucun scénario calculé pour ce projet — relancez le re-calcul.
      </p>
    );
  }

  const dimensions = new Set<string>([
    ...Object.keys(left?.tradeoffs ?? {}),
    ...Object.keys(right?.tradeoffs ?? {}),
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "left", scenario: left, current: leftId, setter: setLeftId },
          { id: "right", scenario: right, current: rightId, setter: setRightId },
        ].map((col) => (
          <div key={col.id} className="space-y-2">
            <select
              value={col.current}
              onChange={(e) => col.setter(e.target.value)}
              className="w-full rounded-sm px-2 py-1.5 text-sm [background:var(--color-bg-secondary)] text-text-primary [border:1px_solid_var(--color-bg-tertiary)]"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kind} · {s.title}
                </option>
              ))}
            </select>
            {col.scenario ? (
              <div className="rounded-md p-3 text-sm [background:var(--color-bg-tertiary)]">
                <p className="text-text-primary font-medium">{col.scenario.title}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {col.scenario.recommendationCount} recommandation
                  {col.scenario.recommendationCount === 1 ? "" : "s"}
                </p>
                <p className="mt-2 text-xs text-text-secondary whitespace-pre-wrap">
                  {col.scenario.summary}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {dimensions.size > 0 ? (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-text-muted uppercase tracking-wider">
            <tr>
              <th className="py-2 pr-3 font-normal">Dimension</th>
              <th className="py-2 px-3 font-normal">{left?.kind ?? "—"}</th>
              <th className="py-2 pl-3 font-normal">{right?.kind ?? "—"}</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {Array.from(dimensions).map((dim) => (
              <tr key={dim} className="[border-top:1px_solid_var(--color-bg-secondary)]">
                <td className="py-2 pr-3 text-text-primary">
                  {DIMENSION_LABELS[dim] ?? dim}
                </td>
                <td className="py-2 px-3">{renderTradeoff(left?.tradeoffs?.[dim])}</td>
                <td className="py-2 pl-3">{renderTradeoff(right?.tradeoffs?.[dim])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
