import * as React from "react";

import type { Observation } from "@/lib/scanner/get-public-result";

const SEVERITY_STYLES: Record<Observation["severity"], string> = {
  info: "border-white/10 text-text-secondary",
  opportunity: "border-accent-cyan/40 text-text-primary",
  risk: "border-rose-400/40 text-text-primary",
};

const CATEGORY_LABEL: Record<Observation["category"], string> = {
  performance: "Performance",
  mobile: "Mobile",
  ai_search: "Visibilité IA / SEO",
  booking_path: "Tunnel de réservation",
  communication: "Communication client",
  tech_stack: "Outils détectés",
};

export function ObservationCard({ observation }: { observation: Observation }) {
  return (
    <article
      className={[
        "glass rounded-md border p-5 transition",
        SEVERITY_STYLES[observation.severity],
      ].join(" ")}
    >
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-text-muted">
          {CATEGORY_LABEL[observation.category]}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-text-muted">
          {observation.severity === "risk"
            ? "À traiter"
            : observation.severity === "opportunity"
              ? "Opportunité"
              : "Constat"}
        </span>
      </header>
      <h3 className="mt-2 text-base font-semibold leading-tight">
        {observation.headline}
      </h3>
      <p className="mt-2 text-sm text-text-secondary">{observation.detail}</p>
      {observation.evidence_hint ? (
        <p className="mt-3 text-xs text-text-muted">
          <span className="opacity-60">Mesure :</span> {observation.evidence_hint}
        </p>
      ) : null}
    </article>
  );
}
