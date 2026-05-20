import * as React from "react";

import type { FreshnessStatus } from "@/lib/governance/freshness";

export interface FreshnessWarningProps {
  status: FreshnessStatus;
  /**
   * Hoteliers see a soft caveat; consultants see the exact age. Defaults to
   * `client` so accidental over-disclosure doesn't happen by omission.
   */
  audience?: "internal" | "client";
  className?: string;
}

function formatAge(ageDays: number | null): string {
  if (ageDays === null) return "jamais vérifié";
  const d = Math.round(ageDays);
  if (d < 30) return `${d} jours`;
  const m = Math.round(d / 30);
  if (m < 12) return `${m} mois`;
  const y = Math.round(d / 365);
  return `${y} an${y > 1 ? "s" : ""}`;
}

export function FreshnessWarning({
  status,
  audience = "client",
  className = "",
}: FreshnessWarningProps) {
  if (!status.isStale) return null;

  const message =
    audience === "internal"
      ? `Information non rafraîchie depuis ${formatAge(status.ageDays)} — à revalider avant publication.`
      : "Information à vérifier : la source n'a pas été rafraîchie récemment.";

  return (
    <p
      role="note"
      className={[
        "text-xs text-[#f1c40f] [background:rgba(241,196,15,0.06)] [border-left:2px_solid_rgba(241,196,15,0.5)]",
        "px-2 py-1.5 rounded-sm leading-relaxed",
        className,
      ].join(" ")}
    >
      {message}
    </p>
  );
}
