/**
 * T068 — Compliance findings (FR-050 / FR-051 / FR-052).
 *
 * Pure rules over the audit context. We deliberately do not "advise" — we
 * surface risk areas + a checklist item (FR-052: no legal advice).
 */
import type { ComplianceFinding, RecommendationContext } from "../types";

function isYes(v: unknown): boolean {
  return v === true || v === "yes";
}
function isNo(v: unknown): boolean {
  return v === false || v === "no";
}
function isIdk(v: unknown): boolean {
  return v === "idk" || v === null || v === undefined;
}

export function generateComplianceFindings(
  ctx: RecommendationContext,
): ComplianceFinding[] {
  const out: ComplianceFinding[] = [];

  // CR-01 — AI transparency notice missing.
  if (
    isYes(ctx.answersByslug["uses_ai_in_guest_replies"]) &&
    isNo(ctx.answersByslug["ai_transparency_notice"])
  ) {
    out.push({
      topic: "ai_transparency",
      severity: "risk",
      explanation:
        "Votre établissement utilise l'IA dans les réponses guest sans information explicite — obligation de transparence (RGPD art. 13–14, AI Act).",
      checklist_item:
        "Publier une mention de transparence IA dans la politique de confidentialité et au premier contact.",
      vendor_id: null,
    });
  }

  // CR-02 — DPA process missing.
  if (isNo(ctx.answersByslug["has_dpa_process"]) || isIdk(ctx.answersByslug["has_dpa_process"])) {
    out.push({
      topic: "dpa_missing",
      severity: "advisory",
      explanation:
        "Aucun processus DPA confirmé avec les sous-traitants traitant des données guest — risque RGPD diffus.",
      checklist_item:
        "Cartographier vos sous-traitants et collecter / signer un DPA pour chacun.",
      vendor_id: null,
    });
  }

  // CR-03 — EU hosting unknown for a vendor in the stack.
  for (const v of ctx.vendorCatalogue) {
    if (v.euHosting === "unknown") {
      out.push({
        topic: "eu_hosting_unknown",
        severity: "advisory",
        explanation: `L'hébergement EU de ${v.slug} n'est pas confirmé — vérifier avant tout transfert de données guest.`,
        checklist_item: `Demander à ${v.slug} une attestation d'hébergement EU et de localisation des sauvegardes.`,
        vendor_id: v.id,
      });
    }
  }

  // CR-04 — Privacy policy missing or unknown.
  if (isNo(ctx.answersByslug["has_privacy_policy"]) || isIdk(ctx.answersByslug["has_privacy_policy"])) {
    out.push({
      topic: "privacy_policy",
      severity: "advisory",
      explanation:
        "Aucune politique de confidentialité confirmée — obligation RGPD pour tout site collectant des données.",
      checklist_item:
        "Publier une politique de confidentialité listant les sous-traitants, finalités et durées de conservation.",
      vendor_id: null,
    });
  }

  // CR-05 — Consent management for marketing.
  if (
    isYes(ctx.answersByslug["captures_guest_emails"]) &&
    !isYes(ctx.answersByslug["consent_captured_explicitly"])
  ) {
    out.push({
      topic: "consent_management",
      severity: "advisory",
      explanation:
        "Des emails guests sont collectés sans confirmation d'un consentement explicite pour marketing.",
      checklist_item:
        "Ajouter une case opt-in claire (non pré-cochée) et conserver la preuve de consentement.",
      vendor_id: null,
    });
  }

  // CR-06 — Retention period unclear.
  if (isIdk(ctx.answersByslug["data_retention_period"])) {
    out.push({
      topic: "retention_unclear",
      severity: "info",
      explanation:
        "Durée de conservation des données guest non définie clairement — un délai par finalité est attendu (RGPD art. 5).",
      checklist_item:
        "Définir et documenter les durées de conservation (réservations actives, archives, fidélité, marketing).",
      vendor_id: null,
    });
  }

  return out;
}
