import * as React from "react";

export interface FreshnessIndicatorProps {
  lastVerifiedAt: Date | string | null;
  windowDays?: number;
}

export function FreshnessIndicator({
  lastVerifiedAt,
  windowDays = 180,
}: FreshnessIndicatorProps) {
  const ts = lastVerifiedAt ? new Date(lastVerifiedAt) : null;
  if (!ts) {
    return (
      <span
        className="text-[11px] text-warning"
        title="Aucune vérification enregistrée"
      >
        Non vérifié
      </span>
    );
  }
  const ageDays = (Date.now() - ts.getTime()) / (1000 * 60 * 60 * 24);
  const stale = ageDays > windowDays;
  return (
    <span
      className={[
        "text-[11px]",
        stale ? "text-warning" : "text-text-muted",
      ].join(" ")}
      title={`Dernière vérification : ${ts.toLocaleDateString("fr-FR")}`}
    >
      {stale ? "Périmé" : "Frais"} · {Math.round(ageDays)}j
    </span>
  );
}
