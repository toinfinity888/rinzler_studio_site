import * as React from "react";

import type { QuickWin } from "@/lib/scanner/get-public-result";

const EFFORT_LABEL: Record<QuickWin["estimated_effort"], string> = {
  low: "Effort faible",
  medium: "Effort moyen",
  high: "Effort élevé",
};

export function OpportunityMap({ wins }: { wins: QuickWin[] }) {
  if (wins.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Aucune action rapide à recommander pour l'instant — l'audit complet
        proposera un plan détaillé.
      </p>
    );
  }
  return (
    <ol className="grid gap-3">
      {wins.map((w, i) => (
        <li key={i} className="glass rounded-md p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">{w.title}</span>
            <span className="text-[11px] uppercase tracking-wide text-text-muted">
              {EFFORT_LABEL[w.estimated_effort]}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-text-secondary">{w.why_it_matters}</p>
        </li>
      ))}
    </ol>
  );
}
