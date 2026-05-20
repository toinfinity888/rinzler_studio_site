/**
 * T112 — Curated compliance findings library (FR + EN).
 *
 * Each entry describes ONE risk pattern that the evaluator (T113) can
 * surface against an audit context. Two important properties:
 *
 *   - The library is declarative — `matches(ctx, vendor?)` is a pure
 *     predicate; explanation/checklist text is data, not code. This lets
 *     us add a new pattern without touching the evaluator and lets the
 *     contract tests (T115/T116) target patterns by id.
 *
 *   - Each pattern carries both FR and EN copy. The evaluator picks the
 *     active language (default `fr` to preserve the legacy behaviour of
 *     `lib/recommend/rules/compliance.ts`).
 *
 * Patterns intentionally do NOT recommend specific products. The audit
 * surfaces risk; the consultant (or hotelier) decides remediation.
 * FR-052 — no legal advice.
 */
import type {
  RecommendationContext,
  Severity,
  VendorCatalogueEntry,
} from "@/lib/recommend/types";

export type FindingScope = "global" | "per_vendor";

export interface LocalisedCopy {
  explanation: string;
  checklist_item: string;
}

export interface ComplianceFindingPattern {
  /** Stable id used by the evaluator + contract tests. */
  id: string;
  /** Coarse topic family — drives grouping in the rendered report. */
  topic: string;
  severity: Severity;
  scope: FindingScope;
  /**
   * Predicate. For `global` patterns the second arg is undefined; for
   * `per_vendor` patterns the evaluator calls this once per vendor in the
   * project's catalogue.
   */
  matches: (
    ctx: RecommendationContext,
    vendor?: VendorCatalogueEntry,
  ) => boolean;
  /**
   * Localised copy. The evaluator picks `fr` or `en` based on the hotel's
   * `primary_language`. `{slug}` placeholders are replaced with the vendor
   * slug for per-vendor patterns.
   */
  copy: {
    fr: LocalisedCopy;
    en: LocalisedCopy;
  };
}

function isYes(v: unknown): boolean {
  return v === true || v === "yes";
}
function isNo(v: unknown): boolean {
  return v === false || v === "no";
}
function isIdk(v: unknown): boolean {
  return v === "idk" || v === null || v === undefined;
}

export const COMPLIANCE_FINDINGS_LIBRARY: ComplianceFindingPattern[] = [
  {
    id: "ai_transparency_missing",
    topic: "ai_transparency",
    severity: "risk",
    scope: "global",
    matches: (ctx) =>
      isYes(ctx.answersByslug["uses_ai_in_guest_replies"]) &&
      isNo(ctx.answersByslug["ai_transparency_notice"]),
    copy: {
      fr: {
        explanation:
          "Votre établissement utilise l'IA dans les réponses guest sans information explicite — obligation de transparence (RGPD art. 13–14, AI Act).",
        checklist_item:
          "Publier une mention de transparence IA dans la politique de confidentialité et au premier contact.",
      },
      en: {
        explanation:
          "Your property uses AI in guest replies without an explicit notice — transparency is required (GDPR art. 13–14, AI Act).",
        checklist_item:
          "Publish an AI transparency notice in the privacy policy and at first guest contact.",
      },
    },
  },

  {
    id: "dpa_missing",
    topic: "dpa_missing",
    severity: "advisory",
    scope: "global",
    matches: (ctx) =>
      isNo(ctx.answersByslug["has_dpa_process"]) ||
      isIdk(ctx.answersByslug["has_dpa_process"]),
    copy: {
      fr: {
        explanation:
          "Aucun processus DPA confirmé avec les sous-traitants traitant des données guest — risque RGPD diffus.",
        checklist_item:
          "Cartographier vos sous-traitants et collecter / signer un DPA pour chacun.",
      },
      en: {
        explanation:
          "No data-processing agreement (DPA) process confirmed with subprocessors handling guest data — diffuse GDPR risk.",
        checklist_item:
          "Map your subprocessors and collect / sign a DPA with each.",
      },
    },
  },

  {
    id: "eu_hosting_unknown",
    topic: "eu_hosting_unknown",
    severity: "advisory",
    scope: "per_vendor",
    matches: (_ctx, vendor) => !!vendor && vendor.euHosting === "unknown",
    copy: {
      fr: {
        explanation:
          "L'hébergement EU de {slug} n'est pas confirmé — vérifier avant tout transfert de données guest.",
        checklist_item:
          "Demander à {slug} une attestation d'hébergement EU et de localisation des sauvegardes.",
      },
      en: {
        explanation:
          "{slug}'s EU hosting is not confirmed — verify before transferring any guest data.",
        checklist_item:
          "Request from {slug} an EU-hosting attestation including backup locations.",
      },
    },
  },

  {
    id: "privacy_policy_missing",
    topic: "privacy_policy",
    severity: "advisory",
    scope: "global",
    matches: (ctx) =>
      isNo(ctx.answersByslug["has_privacy_policy"]) ||
      isIdk(ctx.answersByslug["has_privacy_policy"]),
    copy: {
      fr: {
        explanation:
          "Aucune politique de confidentialité confirmée — obligation RGPD pour tout site collectant des données.",
        checklist_item:
          "Publier une politique de confidentialité listant les sous-traitants, finalités et durées de conservation.",
      },
      en: {
        explanation:
          "No privacy policy confirmed — required under GDPR for any site collecting personal data.",
        checklist_item:
          "Publish a privacy policy listing subprocessors, purposes, and retention periods.",
      },
    },
  },

  {
    id: "consent_management",
    topic: "consent_management",
    severity: "advisory",
    scope: "global",
    matches: (ctx) =>
      isYes(ctx.answersByslug["captures_guest_emails"]) &&
      !isYes(ctx.answersByslug["consent_captured_explicitly"]),
    copy: {
      fr: {
        explanation:
          "Des emails guests sont collectés sans confirmation d'un consentement explicite pour marketing.",
        checklist_item:
          "Ajouter une case opt-in claire (non pré-cochée) et conserver la preuve de consentement.",
      },
      en: {
        explanation:
          "Guest emails are captured without confirmation of explicit marketing consent.",
        checklist_item:
          "Add a clear opt-in checkbox (not pre-ticked) and store the proof of consent.",
      },
    },
  },

  {
    id: "retention_unclear",
    topic: "retention_unclear",
    severity: "info",
    scope: "global",
    matches: (ctx) => isIdk(ctx.answersByslug["data_retention_period"]),
    copy: {
      fr: {
        explanation:
          "Durée de conservation des données guest non définie clairement — un délai par finalité est attendu (RGPD art. 5).",
        checklist_item:
          "Définir et documenter les durées de conservation (réservations actives, archives, fidélité, marketing).",
      },
      en: {
        explanation:
          "Guest-data retention period not clearly defined — a duration per purpose is expected (GDPR art. 5).",
        checklist_item:
          "Define and document retention periods (active bookings, archives, loyalty, marketing).",
      },
    },
  },

  {
    id: "ai_human_escalation_missing",
    topic: "ai_human_escalation",
    severity: "advisory",
    scope: "global",
    matches: (ctx) =>
      isYes(ctx.answersByslug["uses_ai_in_guest_replies"]) &&
      !isYes(ctx.answersByslug["ai_human_escalation"]),
    copy: {
      fr: {
        explanation:
          "L'IA répond aux guests sans procédure d'escalade humaine documentée — risque opérationnel et conformité AI Act.",
        checklist_item:
          "Définir explicitement quand et comment un guest est redirigé vers un humain (mots-clés, ton, demande explicite).",
      },
      en: {
        explanation:
          "AI replies to guests without a documented human-escalation procedure — operational risk and AI Act concern.",
        checklist_item:
          "Define explicitly when and how a guest is escalated to a human (keywords, tone, explicit request).",
      },
    },
  },

  {
    id: "internal_ai_policy_missing",
    topic: "internal_ai_policy",
    severity: "info",
    scope: "global",
    matches: (ctx) =>
      isYes(ctx.answersByslug["uses_ai_in_guest_replies"]) &&
      !isYes(ctx.answersByslug["internal_ai_usage_policy"]),
    copy: {
      fr: {
        explanation:
          "Aucune politique interne d'usage de l'IA documentée — utile pour cadrer ce que les équipes peuvent saisir dans un outil IA (données personnelles, données financières).",
        checklist_item:
          "Rédiger une politique interne d'usage de l'IA (1 page) : données autorisées, données interdites, validation humaine, gestion des erreurs.",
      },
      en: {
        explanation:
          "No documented internal AI-usage policy — useful to frame what staff can enter into AI tools (personal data, financial data).",
        checklist_item:
          "Write a one-page internal AI-usage policy: allowed inputs, forbidden inputs, human review, error handling.",
      },
    },
  },
];
