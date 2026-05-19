import * as React from "react";

import type { ProvenanceSource } from "@/db/schema";

const LABELS: Record<ProvenanceSource, string> = {
  official_vendor: "Officiel (vendeur)",
  public: "Source publique",
  consultant_verified: "Consultant vérifié",
  client_reported: "Hôtelier (déclaré)",
  ai_inferred: "Inféré IA",
  outdated: "Obsolète",
  uncertain: "Incertain",
};

const TONE: Record<ProvenanceSource, string> = {
  official_vendor: "text-success border-success/40",
  public: "text-text-secondary border-white/15",
  consultant_verified: "text-accent-cyan border-accent-cyan/40",
  client_reported: "text-accent-purple border-accent-purple/40",
  ai_inferred: "text-warning border-warning/40",
  outdated: "text-text-muted border-white/10 line-through",
  uncertain: "text-warning border-warning/40",
};

export function SourceLabelChip({ source }: { source: ProvenanceSource }) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border",
        TONE[source] ?? "text-text-muted border-white/10",
      ].join(" ")}
      title={`Provenance: ${source}`}
    >
      {LABELS[source] ?? source}
    </span>
  );
}
