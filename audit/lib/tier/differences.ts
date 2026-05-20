/**
 * T125 — Canonical tier-difference catalogue (FR-080 / FR-081).
 *
 * Single source of truth for what each tier produces and what the next
 * tier adds. Consumed by:
 *   - `lib/auth/tier-gate.ts` (which artefacts each tier may access)
 *   - the public `/upgrade` page (T124) — comparison table
 *   - any future "what changes if I upgrade?" surface inside the audit
 *
 * Stored as data, not code: adding a new artefact only requires touching
 * this file. No vendor-specific marketing content lives here — the copy
 * is generic ("recommandations" vs. "vendor-x recommandé").
 */
import type { ProjectTier } from "@/db/schema/identity";

export type TierArtefact =
  | "free_scan_summary"
  | "scan_findings_detail"
  | "audit_questionnaire"
  | "rules_recommendations"
  | "scenarios"
  | "readiness_scores"
  | "roadmap"
  | "compliance_findings"
  | "funding_brief"
  | "consultant_review"
  | "consultant_overrides"
  | "implementation_handover"
  | "vendor_quote_brokerage";

export interface TierDefinition {
  tier: ProjectTier;
  label_fr: string;
  label_en: string;
  /** Indicative price band; the actual quote lives outside this code. */
  price_band_fr: string;
  price_band_en: string;
  /** Short positioning sentence rendered in the comparison header. */
  tagline_fr: string;
  tagline_en: string;
  /** Artefacts produced AT this tier (cumulative). */
  artefacts: TierArtefact[];
  /** What the hotelier sees when this tier is the active one. */
  highlights_fr: string[];
  highlights_en: string[];
}

export const ARTEFACT_LABELS: Record<TierArtefact, { fr: string; en: string }> = {
  free_scan_summary: {
    fr: "Synthèse du scan gratuit (signaux publics)",
    en: "Free-scan summary (public signals)",
  },
  scan_findings_detail: {
    fr: "Détail technique des findings du scan",
    en: "Technical detail of scan findings",
  },
  audit_questionnaire: {
    fr: "Questionnaire diagnostic complet (22 blocs)",
    en: "Full diagnostic questionnaire (22 blocks)",
  },
  rules_recommendations: {
    fr: "Recommandations générées par le moteur de règles",
    en: "Rule-engine generated recommendations",
  },
  scenarios: {
    fr: "Scénarios comparés : minimal / équilibré / avancé",
    en: "Compared scenarios: minimal / balanced / advanced",
  },
  readiness_scores: {
    fr: "Scores de préparation par dimension (website, IA, etc.)",
    en: "Per-dimension readiness scores (website, AI, etc.)",
  },
  roadmap: {
    fr: "Feuille de route 30 / 60 / 90 jours",
    en: "30 / 60 / 90 day roadmap",
  },
  compliance_findings: {
    fr: "Section conformité (RGPD, IA, hébergement, DPA)",
    en: "Compliance section (GDPR, AI, hosting, DPA)",
  },
  funding_brief: {
    fr: "Note de cadrage projet (programmes de soutien FR)",
    en: "Project framing note (FR public-support programmes)",
  },
  consultant_review: {
    fr: "Revue par un consultant Rinzler avant publication",
    en: "Rinzler consultant review prior to publication",
  },
  consultant_overrides: {
    fr: "Ajustements consultant visibles + justifiés",
    en: "Consultant adjustments — visible and justified",
  },
  implementation_handover: {
    fr: "Accompagnement de mise en œuvre + suivi vendor",
    en: "Implementation hand-over + vendor follow-up",
  },
  vendor_quote_brokerage: {
    fr: "Sollicitation de devis vendor pour votre compte",
    en: "Vendor quote brokerage on your behalf",
  },
};

export const TIERS: TierDefinition[] = [
  {
    tier: "free_scan",
    label_fr: "Scan gratuit",
    label_en: "Free scan",
    price_band_fr: "Gratuit",
    price_band_en: "Free",
    tagline_fr:
      "Une lecture rapide de votre présence digitale à partir des signaux publics.",
    tagline_en:
      "A fast read of your digital presence from public signals only.",
    artefacts: ["free_scan_summary"],
    highlights_fr: [
      "Détection basique : structure du site, indicateurs IA, bouton de réservation directe",
      "Aucune donnée privée requise",
      "Lien partageable",
    ],
    highlights_en: [
      "Basic detection: site structure, AI signals, direct-booking button",
      "No private data required",
      "Shareable link",
    ],
  },
  {
    tier: "mini",
    label_fr: "Diagnostic mini",
    label_en: "Mini diagnostic",
    price_band_fr: "Indicatif : forfait fixe (entrée)",
    price_band_en: "Indicative: fixed entry-level fee",
    tagline_fr:
      "Un premier diagnostic structuré avec recommandations actionnables.",
    tagline_en: "A first structured diagnostic with actionable recommendations.",
    artefacts: [
      "free_scan_summary",
      "audit_questionnaire",
      "rules_recommendations",
      "readiness_scores",
    ],
    highlights_fr: [
      "Questionnaire diagnostic et scores de préparation",
      "Recommandations principales sans scénarios comparés",
      "Sans feuille de route détaillée 30/60/90",
    ],
    highlights_en: [
      "Diagnostic questionnaire and readiness scores",
      "Main recommendations without compared scenarios",
      "No detailed 30/60/90 roadmap",
    ],
  },
  {
    tier: "full",
    label_fr: "Diagnostic complet",
    label_en: "Full diagnostic",
    price_band_fr: "Indicatif : forfait diagnostic complet",
    price_band_en: "Indicative: full-diagnostic fixed fee",
    tagline_fr:
      "L'ensemble du diagnostic : scénarios, conformité, feuille de route, note de cadrage.",
    tagline_en:
      "The full diagnostic: scenarios, compliance, roadmap, funding brief.",
    artefacts: [
      "free_scan_summary",
      "scan_findings_detail",
      "audit_questionnaire",
      "rules_recommendations",
      "scenarios",
      "readiness_scores",
      "roadmap",
      "compliance_findings",
      "funding_brief",
    ],
    highlights_fr: [
      "Scénarios comparés (minimal / équilibré / avancé)",
      "Section conformité RGPD / IA",
      "Note de cadrage projet pour les programmes de financement FR",
    ],
    highlights_en: [
      "Compared scenarios (minimal / balanced / advanced)",
      "GDPR / AI compliance section",
      "Project framing note for FR funding programmes",
    ],
  },
  {
    tier: "consultant_assisted",
    label_fr: "Diagnostic + revue consultant",
    label_en: "Diagnostic + consultant review",
    price_band_fr: "Indicatif : diagnostic complet + journée consultant",
    price_band_en: "Indicative: full diagnostic + one consultant-day",
    tagline_fr:
      "Toutes les sorties du diagnostic complet, relues et ajustées par un consultant.",
    tagline_en:
      "All full-diagnostic outputs, reviewed and adjusted by a consultant.",
    artefacts: [
      "free_scan_summary",
      "scan_findings_detail",
      "audit_questionnaire",
      "rules_recommendations",
      "scenarios",
      "readiness_scores",
      "roadmap",
      "compliance_findings",
      "funding_brief",
      "consultant_review",
      "consultant_overrides",
    ],
    highlights_fr: [
      "Lecture humaine du rapport avant publication",
      "Ajustements consultant tracés et justifiés",
      "Scénarios calibrés sur votre contexte",
    ],
    highlights_en: [
      "Human review of the report prior to publication",
      "Traced and justified consultant adjustments",
      "Scenarios calibrated to your context",
    ],
  },
  {
    tier: "implementation",
    label_fr: "Accompagnement de mise en œuvre",
    label_en: "Implementation support",
    price_band_fr: "Sur devis (forfait par phase)",
    price_band_en: "Quoted (per-phase fixed scope)",
    tagline_fr:
      "Au-delà du diagnostic : sollicitation de devis vendor et suivi de mise en œuvre.",
    tagline_en:
      "Beyond the diagnostic: vendor quote sourcing and implementation follow-up.",
    artefacts: [
      "free_scan_summary",
      "scan_findings_detail",
      "audit_questionnaire",
      "rules_recommendations",
      "scenarios",
      "readiness_scores",
      "roadmap",
      "compliance_findings",
      "funding_brief",
      "consultant_review",
      "consultant_overrides",
      "implementation_handover",
      "vendor_quote_brokerage",
    ],
    highlights_fr: [
      "Demande de devis vendor pour votre compte",
      "Suivi des arbitrages tout au long de la mise en œuvre",
      "Coordination avec un expert-comptable si financement",
    ],
    highlights_en: [
      "Vendor quote requests on your behalf",
      "Decision follow-up throughout implementation",
      "Coordination with your accountant if funding is involved",
    ],
  },
];

const TIER_INDEX: Record<ProjectTier, number> = Object.fromEntries(
  TIERS.map((t, i) => [t.tier, i]),
) as Record<ProjectTier, number>;

export function getTier(tier: ProjectTier): TierDefinition {
  const t = TIERS.find((d) => d.tier === tier);
  if (!t) throw new Error(`Unknown tier: ${tier}`);
  return t;
}

/**
 * `true` if `tier` produces (or includes) the given artefact. Used by the
 * tier-gate (T123) to decide whether a server action may run for a given
 * project. Encapsulates the cumulative-artefact rule so the gate itself
 * stays trivial.
 */
export function tierIncludes(tier: ProjectTier, artefact: TierArtefact): boolean {
  return getTier(tier).artefacts.includes(artefact);
}

/** Returns the lowest-priced tier that produces `artefact`, or null. */
export function minimumTierFor(artefact: TierArtefact): ProjectTier | null {
  const found = TIERS.find((t) => t.artefacts.includes(artefact));
  return found?.tier ?? null;
}

/**
 * Artefacts added by `nextTier` compared to `currentTier`. Powers the
 * "what do I get if I upgrade?" panel on the /upgrade page.
 */
export function artefactsAddedBetween(
  currentTier: ProjectTier,
  nextTier: ProjectTier,
): TierArtefact[] {
  const current = new Set(getTier(currentTier).artefacts);
  return getTier(nextTier).artefacts.filter((a) => !current.has(a));
}

/** Next tier in the canonical ladder, or null if `tier` is the top. */
export function nextTier(tier: ProjectTier): ProjectTier | null {
  const i = TIER_INDEX[tier];
  return i + 1 < TIERS.length ? TIERS[i + 1]!.tier : null;
}
