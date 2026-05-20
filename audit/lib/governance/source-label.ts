/**
 * T127 — Per-field source-label renderer (FR-110 + FR-111).
 *
 * Pure functions. Map a `ProvenanceRecord` (or a list of them, when a
 * field has been touched by multiple sources) into the data the UI chips
 * render: a short label, a tone, and a freshness assessment.
 *
 * Two audience modes (FR-111):
 *  - "internal" → consultants and admins see the full freshness state
 *    (exact age, "stale" flag, contributor identity).
 *  - "client"  → hoteliers see a softer caveat ("information à vérifier")
 *    when the field is stale, no age in days, no contributor name.
 *
 * The components in `components/governance/` consume these helpers; no
 * React here so the same data shape can be reused in PDF render and in
 * the report snapshot.
 */
import type { ProvenanceSource } from "@/db/schema";

import {
  DEFAULT_FRESHNESS_DAYS,
  freshnessStatus,
} from "./freshness";

export type SourceTone = "trusted" | "neutral" | "caution" | "warning";
export type Audience = "internal" | "client";

export interface RenderedSourceLabel {
  /** Short text shown inside the chip (FR-only for now; EN added later). */
  label: string;
  tone: SourceTone;
  /** Tooltip / detail line. Includes the contributor only for internal. */
  detail: string;
  /** Whether the underlying value is past its freshness window. */
  isStale: boolean;
  /** Age in days; `null` when never verified OR audience is "client". */
  ageDays: number | null;
}

export interface ProvenanceLike {
  source: ProvenanceSource;
  contributorLabel: string | null;
  lastVerifiedAt: Date | null;
  confidence: "high" | "medium" | "low" | string;
  conflictNote: string | null;
}

const SOURCE_LABEL_FR: Record<ProvenanceSource, string> = {
  official_vendor: "Source officielle vendor",
  public: "Source publique",
  consultant_verified: "Vérifié consultant",
  client_reported: "Déclaré par l'hôtel",
  ai_inferred: "Déduit par IA",
  outdated: "Source dépassée",
  uncertain: "Source incertaine",
};

const SOURCE_TONE: Record<ProvenanceSource, SourceTone> = {
  official_vendor: "trusted",
  consultant_verified: "trusted",
  public: "neutral",
  client_reported: "neutral",
  ai_inferred: "caution",
  uncertain: "caution",
  outdated: "warning",
};

function formatAge(ageDays: number | null): string {
  if (ageDays === null) return "jamais vérifié";
  const d = Math.round(ageDays);
  if (d <= 1) return "moins d'un jour";
  if (d < 30) return `${d} j`;
  const m = Math.round(d / 30);
  if (m < 12) return `${m} mois`;
  const y = Math.round(d / 365);
  return `${y} an${y > 1 ? "s" : ""}`;
}

export function renderSourceLabel(
  record: ProvenanceLike,
  audience: Audience = "client",
  freshnessWindowDays: number = DEFAULT_FRESHNESS_DAYS,
): RenderedSourceLabel {
  const { isStale, ageDays } = freshnessStatus(
    record.lastVerifiedAt,
    freshnessWindowDays,
  );

  const baseLabel = SOURCE_LABEL_FR[record.source];
  const tone: SourceTone = isStale ? "warning" : SOURCE_TONE[record.source];

  let detail: string;
  if (audience === "internal") {
    const ageText = formatAge(ageDays);
    const contributor = record.contributorLabel
      ? ` · ${record.contributorLabel}`
      : "";
    const conflict = record.conflictNote
      ? ` · conflit : ${record.conflictNote}`
      : "";
    detail = `${baseLabel} · ${ageText}${contributor}${conflict}`;
  } else {
    detail = isStale
      ? `${baseLabel} · information à vérifier`
      : baseLabel;
  }

  return {
    label: isStale ? `${baseLabel} (à vérifier)` : baseLabel,
    tone,
    detail,
    isStale,
    ageDays: audience === "internal" ? ageDays : null,
  };
}

/**
 * When several rows touch the same field, the render layer needs ONE
 * summary chip plus a flag if the values conflict. Picks the most-
 * trusted-and-fresh row to lead with and flips `hasConflict=true` when
 * sources disagree (FR-112 — surface, never silently choose).
 */
export interface AggregatedLabel extends RenderedSourceLabel {
  hasConflict: boolean;
  contributorCount: number;
}

const TONE_RANK: Record<SourceTone, number> = {
  trusted: 0,
  neutral: 1,
  caution: 2,
  warning: 3,
};

export function aggregateSourceLabel(
  records: ProvenanceLike[],
  audience: Audience = "client",
  freshnessWindowDays: number = DEFAULT_FRESHNESS_DAYS,
): AggregatedLabel | null {
  if (records.length === 0) return null;
  const rendered = records.map((r) => ({
    rec: r,
    rendered: renderSourceLabel(r, audience, freshnessWindowDays),
  }));

  // Pick the lead row: lowest tone rank (most trusted) wins; tiebreak by
  // newest verification.
  rendered.sort((a, b) => {
    const r = TONE_RANK[a.rendered.tone] - TONE_RANK[b.rendered.tone];
    if (r !== 0) return r;
    const av = a.rec.lastVerifiedAt?.getTime() ?? 0;
    const bv = b.rec.lastVerifiedAt?.getTime() ?? 0;
    return bv - av;
  });

  const lead = rendered[0]!;
  const distinctSources = new Set(records.map((r) => r.source));
  const distinctContributors = new Set(
    records
      .map((r) => r.contributorLabel)
      .filter((s): s is string => !!s),
  );
  const hasConflict =
    distinctSources.size > 1 || records.some((r) => !!r.conflictNote);

  return {
    ...lead.rendered,
    hasConflict,
    contributorCount: distinctContributors.size,
  };
}