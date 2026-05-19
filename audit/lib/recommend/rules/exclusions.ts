/**
 * T068 — Exclusion rules (the "what not to do now" section, FR-033).
 *
 * Each rule is one anti-pattern. They produce `RuleRecommendation` rows with
 * `do_not_do_now=true` and an explanation that references the signals that
 * triggered the rule (FR-113). Rules are pure functions of the context.
 *
 * Aim for 8–12 rules at launch — covering the acceptance scenarios in
 * spec §US3 and the edge cases at spec §"Edge Cases".
 */
import { randomUUID } from "node:crypto";

import type { RecommendationContext, RuleRecommendation } from "../types";

function makeExclusion(args: {
  rule_id: string;
  action: string;
  reason: string;
  reconsider_when: string;
  signals: {
    answers: string[];
    scan_findings?: string[];
    vendor_fields?: string[];
  };
}): RuleRecommendation {
  return {
    id: randomUUID(),
    action: args.action,
    scenario_kind: "standalone",
    vendor_id: null,
    vendor_version_id: null,
    vendor_name: null,
    vendor_category: null,
    explanation: {
      relevance: args.reason,
      problem_solved: "—",
      change: "Postpone this initiative.",
      benefit: "Avoid premature investment until the prerequisites are met.",
      effort: "n/a",
      risks: args.reason,
      check_before: args.reconsider_when,
      alternatives: [],
      do_nothing_consequence: "No additional risk by postponing this action now.",
    },
    impact: {
      operational: "low",
      workload_reduction: "low",
      guest_experience: "low",
      response_speed: "low",
      consistency: "low",
      onboarding: "low",
      direct_booking: "low",
      complexity: "low",
      cost_band: "free",
      time_to_deploy: "quarter_plus",
      risk_level: "low",
      dependencies: [],
      confidence: "high",
    },
    confidence: "high",
    do_not_do_now: true,
    do_not_do_reason: args.reason,
    signals_consulted: {
      answers: args.signals.answers,
      scan_findings: args.signals.scan_findings ?? [],
      vendor_fields: args.signals.vendor_fields ?? [],
    },
    rule_id: args.rule_id,
    priority: 100,
    expected_effort: "low",
    expected_impact: "low",
    dependencies: [],
    recommended_owner: "hotelier",
  };
}

/* ----------------------------- 8–12 rules ----------------------------- */

/**
 * EX-01 — PMS migration when budget is low and change appetite is low.
 */
export function excludePmsMigration(ctx: RecommendationContext): RuleRecommendation | null {
  const budget = ctx.project.budget_level;
  const changeRaw = ctx.answersByslug["change_readiness"];
  const change = typeof changeRaw === "number" ? changeRaw : null;
  const lowBudget = budget === "low" || budget === "none";
  const lowChange = change != null && change < 3;
  if (lowBudget && lowChange) {
    return makeExclusion({
      rule_id: "EX-01-pms-migration",
      action: "Migrer le PMS ce trimestre",
      reason:
        "Votre budget et votre appétit au changement ne permettent pas une migration PMS sereine ce trimestre.",
      reconsider_when:
        "À reconsidérer quand le budget passe à 'modéré' ou que l'équipe a stabilisé ses outils actuels.",
      signals: { answers: ["budget_level", "change_readiness"] },
    });
  }
  return null;
}

/**
 * EX-02 — AI agent before a knowledge base exists.
 */
export function excludeAiAgentWithoutKb(ctx: RecommendationContext): RuleRecommendation | null {
  const hasKb = ctx.answersByslug["has_knowledge_base"];
  const wantsAi =
    ctx.project.goal_primary === "ai_readiness" ||
    (ctx.answersByslug["wants_ai_agent"] ?? null) === "yes";
  if (wantsAi && (hasKb === "no" || hasKb === false || hasKb === "idk" || !hasKb)) {
    return makeExclusion({
      rule_id: "EX-02-ai-agent-no-kb",
      action: "Déployer un agent IA pour les guests",
      reason:
        "Un agent IA sans base de connaissances structurée hallucine ou répond à côté — la base de connaissances est un prérequis.",
      reconsider_when:
        "Quand la base de connaissances couvre au minimum pré-arrivée, accès, breakfast, parking et facturation.",
      signals: { answers: ["has_knowledge_base", "wants_ai_agent", "goal_primary"] },
    });
  }
  return null;
}

/**
 * EX-03 — Channel manager when only 1–2 OTA channels are used.
 */
export function excludeChannelManagerLowDistribution(
  ctx: RecommendationContext,
): RuleRecommendation | null {
  const channels = ctx.answersByslug["distribution_channels"];
  const arr = Array.isArray(channels) ? channels : [];
  if (arr.length > 0 && arr.length <= 2) {
    return makeExclusion({
      rule_id: "EX-03-channel-mgr-low",
      action: "Mettre en place un channel manager dédié",
      reason:
        "Avec seulement 1–2 canaux de distribution, le surcoût d'un channel manager dépasse le bénéfice de centralisation.",
      reconsider_when:
        "À envisager quand vous passez à 3 canaux ou plus, ou en cas de double-réservation.",
      signals: { answers: ["distribution_channels"] },
    });
  }
  return null;
}

/**
 * EX-04 — WhatsApp automation when WhatsApp Business is not even visible.
 */
export function excludeWhatsappAutomation(ctx: RecommendationContext): RuleRecommendation | null {
  const whatsappVisible = ctx.scanByField["whatsapp_visible"];
  const usesWhatsapp = ctx.answersByslug["uses_whatsapp"];
  if (whatsappVisible === false && (usesWhatsapp === "no" || !usesWhatsapp)) {
    return makeExclusion({
      rule_id: "EX-04-whatsapp-automation-premature",
      action: "Mettre en place l'automatisation WhatsApp",
      reason:
        "WhatsApp n'est ni visible sur le site ni utilisé par l'équipe — automatiser un canal absent est prématuré.",
      reconsider_when:
        "Quand WhatsApp Business est activé et visible sur les pages contact / réservation.",
      signals: {
        answers: ["uses_whatsapp"],
        scan_findings: ["whatsapp_visible"],
      },
    });
  }
  return null;
}

/**
 * EX-05 — New CRM when the hotel has no clear marketing strategy or list.
 */
export function excludeNewCrm(ctx: RecommendationContext): RuleRecommendation | null {
  const hasMarketingStrategy = ctx.answersByslug["marketing_strategy"];
  const hasGuestEmails = ctx.answersByslug["captures_guest_emails"];
  if (
    (hasMarketingStrategy === "no" || hasMarketingStrategy === "idk") &&
    (hasGuestEmails === "no" || hasGuestEmails === "idk")
  ) {
    return makeExclusion({
      rule_id: "EX-05-crm-no-strategy",
      action: "Acquérir un CRM hôtelier complet",
      reason:
        "Un CRM sans stratégie marketing ni base d'emails à exploiter devient un coût récurrent sans ROI mesurable.",
      reconsider_when:
        "Quand la collecte d'emails de séjour est en place et qu'une stratégie marketing (relance / fidélisation) est définie.",
      signals: { answers: ["marketing_strategy", "captures_guest_emails"] },
    });
  }
  return null;
}

/**
 * EX-06 — Direct-booking redesign when the website is already strong on booking.
 */
export function excludeWebsiteOverhaulIfHealthy(
  ctx: RecommendationContext,
): RuleRecommendation | null {
  const bookingTarget = ctx.scanByField["booking_button_target"];
  const mobileScore = ctx.scanByField["lighthouse_performance_mobile"];
  const goal = ctx.project.goal_primary;
  if (
    bookingTarget === "internal" &&
    typeof mobileScore === "number" &&
    mobileScore >= 75 &&
    goal !== "direct_bookings"
  ) {
    return makeExclusion({
      rule_id: "EX-06-website-overhaul-healthy",
      action: "Refaire entièrement le site web",
      reason:
        "Le bouton de réservation pointe déjà en interne et le score mobile dépasse 75 — refaire le site n'apportera pas de gain proportionnel.",
      reconsider_when:
        "À envisager seulement si l'identité visuelle ne reflète plus l'expérience guest, ou si la conversion devient un objectif explicite.",
      signals: {
        scan_findings: ["booking_button_target", "lighthouse_performance_mobile"],
        answers: ["goal_primary"],
      },
    });
  }
  return null;
}

/**
 * EX-07 — Revenue management when occupancy data isn't tracked.
 */
export function excludeRevenueManagement(ctx: RecommendationContext): RuleRecommendation | null {
  const tracksOccupancy = ctx.answersByslug["tracks_occupancy"];
  if (tracksOccupancy === "no" || tracksOccupancy === "idk") {
    return makeExclusion({
      rule_id: "EX-07-rms-no-occupancy-data",
      action: "Souscrire à un Revenue Management System",
      reason:
        "Un RMS pilote des tarifs à partir d'un historique d'occupation — sans cet historique, le système n'a pas de matière à exploiter.",
      reconsider_when:
        "Quand 6 mois d'historique d'occupation propre sont disponibles dans le PMS.",
      signals: { answers: ["tracks_occupancy"] },
    });
  }
  return null;
}

/**
 * EX-08 — Multilingual content expansion when the current FR content is incomplete.
 */
export function excludeMultilingualExpansion(
  ctx: RecommendationContext,
): RuleRecommendation | null {
  const hreflang = ctx.scanByField["hreflang_present"];
  const frContentComplete = ctx.answersByslug["fr_content_complete"];
  if (hreflang === true && frContentComplete === "no") {
    return makeExclusion({
      rule_id: "EX-08-multilang-before-fr",
      action: "Élargir le site dans davantage de langues",
      reason:
        "Plusieurs versions linguistiques existent déjà alors que le FR canonique est incomplet — multiplier les langues amplifie le déficit.",
      reconsider_when:
        "Quand la version FR couvre tout le parcours (réservation, FAQ, mentions, contact) sans page vide.",
      signals: {
        scan_findings: ["hreflang_present"],
        answers: ["fr_content_complete"],
      },
    });
  }
  return null;
}

/**
 * EX-09 — Heavy automation when staff training/adoption is low.
 */
export function excludeHeavyAutomationLowAdoption(
  ctx: RecommendationContext,
): RuleRecommendation | null {
  const staffComfort = ctx.answersByslug["staff_tool_comfort"];
  const comfortRaw = typeof staffComfort === "number" ? staffComfort : null;
  if (comfortRaw != null && comfortRaw < 3) {
    return makeExclusion({
      rule_id: "EX-09-heavy-automation-low-adoption",
      action: "Empiler des automatisations complexes (multi-outils, workflows croisés)",
      reason:
        "L'équipe a un faible niveau de confort avec les outils — empiler des automatisations transverses générera plus d'incidents que de gains.",
      reconsider_when:
        "Quand le confort de l'équipe atteint 3+ sur 5, ou après une formation outillage dédiée.",
      signals: { answers: ["staff_tool_comfort"] },
    });
  }
  return null;
}

/**
 * EX-10 — Adopting any new tool without GDPR posture clarity in compliance audits.
 */
export function excludeNewToolWithoutDpa(
  ctx: RecommendationContext,
): RuleRecommendation | null {
  const hasDpaProcess = ctx.answersByslug["has_dpa_process"];
  if (
    ctx.project.goal_primary === "ai_readiness" &&
    (hasDpaProcess === "no" || hasDpaProcess === "idk")
  ) {
    return makeExclusion({
      rule_id: "EX-10-no-dpa-no-new-ai",
      action: "Souscrire à un nouvel outil IA externe",
      reason:
        "Aucun processus DPA n'est en place — ajouter un sous-traitant IA crée une exposition RGPD non maîtrisée.",
      reconsider_when:
        "Quand un modèle de DPA est prêt à être signé avec chaque nouveau sous-traitant.",
      signals: { answers: ["has_dpa_process", "goal_primary"] },
    });
  }
  return null;
}

/**
 * EX-11 — Big-bang stack consolidation when "I don't know" answers dominate the audit.
 */
export function excludeBigBangIfManyIdk(
  ctx: RecommendationContext,
): RuleRecommendation | null {
  const lowConfidence = Object.values(ctx.answerConfidence).filter((c) => c === "low").length;
  const total = Object.keys(ctx.answerConfidence).length || 1;
  if (lowConfidence / total > 0.4) {
    return makeExclusion({
      rule_id: "EX-11-bigbang-with-idk",
      action: "Lancer une refonte stack complète maintenant",
      reason:
        "Plus de 40 % des réponses sont 'je ne sais pas' — une refonte massive sans visibilité conduit à des choix mal calibrés.",
      reconsider_when:
        "Quand les sections clé du questionnaire (stack, opérations, budget) sont renseignées avec confiance.",
      signals: { answers: ["audit_confidence_signal"] },
    });
  }
  return null;
}

/* ----------------------------- dispatcher ----------------------------- */

export function generateExclusions(ctx: RecommendationContext): RuleRecommendation[] {
  const rules = [
    excludePmsMigration,
    excludeAiAgentWithoutKb,
    excludeChannelManagerLowDistribution,
    excludeWhatsappAutomation,
    excludeNewCrm,
    excludeWebsiteOverhaulIfHealthy,
    excludeRevenueManagement,
    excludeMultilingualExpansion,
    excludeHeavyAutomationLowAdoption,
    excludeNewToolWithoutDpa,
    excludeBigBangIfManyIdk,
  ];
  return rules.map((rule) => rule(ctx)).filter((r): r is RuleRecommendation => r !== null);
}
