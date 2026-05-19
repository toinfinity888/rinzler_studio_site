/**
 * T068 — Positive recommendation rules.
 *
 * Each rule converts the audit context into one or more "do this" actions
 * with explanation, impact, and signals_consulted. Rules are pure and small.
 *
 * Conventions:
 *  - Rule id format: REC-<NN>-<short-slug>
 *  - One rule = one archetype (so the impact estimator is consistent).
 *  - Always enumerate signals_consulted so the rendered recommendation is
 *    traceable (FR-113 / SC-010).
 */
import { randomUUID } from "node:crypto";

import {
  estimateImpact,
  type RecommendationArchetype,
} from "../impact-estimator";
import type {
  Band,
  ExplanationShape,
  RecommendationContext,
  RuleRecommendation,
  SignalsConsulted,
  VendorCatalogueEntry,
} from "../types";

import { eligibleGuestMessaging, eligibleReviewManagement } from "./eligibility";

interface RuleMakeArgs {
  rule_id: string;
  archetype: RecommendationArchetype;
  action: string;
  scenario_kind: RuleRecommendation["scenario_kind"];
  vendor?: VendorCatalogueEntry | null;
  explanation: ExplanationShape;
  confidence?: Band;
  signals: SignalsConsulted;
  expected_effort: Band;
  expected_impact: Band;
  priority: number;
  dependencies?: string[];
  recommended_owner?: RuleRecommendation["recommended_owner"];
}

function makeRec(args: RuleMakeArgs, ctx: RecommendationContext): RuleRecommendation {
  const impact = estimateImpact(args.archetype, ctx, {
    dependencies: args.dependencies ?? [],
  });
  const finalConfidence = args.confidence ?? impact.confidence;
  return {
    id: randomUUID(),
    action: args.action,
    scenario_kind: args.scenario_kind,
    vendor_id: args.vendor?.id ?? null,
    vendor_version_id: args.vendor?.currentVersionId ?? null,
    vendor_name: args.vendor?.slug ?? null,
    vendor_category: args.vendor?.category ?? null,
    explanation: args.explanation,
    impact,
    confidence: finalConfidence,
    do_not_do_now: false,
    do_not_do_reason: null,
    signals_consulted: args.signals,
    rule_id: args.rule_id,
    priority: args.priority,
    expected_effort: args.expected_effort,
    expected_impact: args.expected_impact,
    dependencies: args.dependencies ?? [],
    recommended_owner: args.recommended_owner ?? "hotelier",
  };
}

function isYes(v: unknown): boolean {
  return v === true || v === "yes";
}

function isNo(v: unknown): boolean {
  return v === false || v === "no";
}

/* ============================================================
 *  Rule library — ~14 positive rules
 * ============================================================ */

/** REC-01 — Knowledge base creation (foundation for many later wins). */
export function recKnowledgeBase(ctx: RecommendationContext): RuleRecommendation | null {
  const has = ctx.answersByslug["has_knowledge_base"];
  if (has === "yes" || isYes(has)) return null;
  return makeRec(
    {
      rule_id: "REC-01-knowledge-base",
      archetype: "knowledge_base",
      action: "Construire une base de connaissances structurée (pré-arrivée, accès, breakfast, parking, late check-in, facturation, chambres, demandes spéciales)",
      scenario_kind: "minimal",
      explanation: {
        relevance:
          "Une base de connaissances structurée alimente FAQ, modèles de réponse, formation équipe et — à terme — un agent IA. C'est la fondation à coût nul.",
        problem_solved:
          "Questions guests répétées, dépendance à la mémoire d'un seul membre de l'équipe, réponses incohérentes.",
        change:
          "Documentation centralisée par thème, accessible à l'équipe; réutilisable pour site/WhatsApp/IA.",
        benefit:
          "Réduction sensible des questions répétées, montée en autonomie de l'équipe, base pour futures automatisations.",
        effort: "Faible — 5 à 8 heures de rédaction, format simple (Markdown ou doc partagé).",
        risks: "Aucun risque opérationnel; risque de contenu obsolète si non maintenu.",
        check_before:
          "Recenser les 20 questions guests les plus fréquentes avant de structurer.",
        alternatives: [
          "Démarrer par une FAQ publique simple sur le site",
          "Constituer une liste de modèles de réponses email/WhatsApp",
        ],
        do_nothing_consequence:
          "Les questions répétées continueront d'absorber du temps réception et la formation restera tribale.",
      },
      confidence: "high",
      signals: {
        answers: ["has_knowledge_base", "operational_workload_pressure"],
        scan_findings: ["faq_present"],
        vendor_fields: [],
      },
      expected_effort: "low",
      expected_impact: "high",
      priority: 10,
    },
    ctx,
  );
}

/** REC-02 — Response templates. */
export function recResponseTemplates(ctx: RecommendationContext): RuleRecommendation | null {
  const has = ctx.answersByslug["has_response_templates"];
  if (isYes(has)) return null;
  return makeRec(
    {
      rule_id: "REC-02-response-templates",
      archetype: "response_templates",
      action:
        "Mettre en place 8 à 12 modèles de réponse (pré-arrivée, late check-in, parking, breakfast, demandes spéciales, après-séjour)",
      scenario_kind: "minimal",
      explanation: {
        relevance:
          "Les modèles standardisent la qualité de réponse et libèrent du temps réception en quelques heures.",
        problem_solved:
          "Réponses lentes ou inconsistantes selon la personne au desk; absence d'un canal écrit fiable.",
        change:
          "Bibliothèque de modèles bilingues FR/EN prête à coller dans email/WhatsApp.",
        benefit:
          "Temps de réponse divisé, ton de marque cohérent, formation accélérée des nouveaux arrivants.",
        effort: "Faible — 2 à 4 heures.",
        risks: "Robotisation excessive si pas personnalisés sur les noms/dates.",
        check_before:
          "Définir le ton de marque (tutoiement / vouvoiement, signature) en amont.",
        alternatives: ["Utiliser les réponses automatiques de Gmail/Outlook"],
        do_nothing_consequence:
          "Réponses lentes/disparates, charge cognitive sur le desk.",
      },
      signals: {
        answers: ["has_response_templates", "response_time_sla_hours"],
        scan_findings: [],
        vendor_fields: [],
      },
      expected_effort: "low",
      expected_impact: "medium",
      priority: 20,
    },
    ctx,
  );
}

/** REC-03 — Schema.org Hotel markup. */
export function recSchemaMarkup(ctx: RecommendationContext): RuleRecommendation | null {
  if (ctx.scanByField["schema_hotel_present"] === true) return null;
  return makeRec(
    {
      rule_id: "REC-03-schema-markup",
      archetype: "schema_markup",
      action:
        "Ajouter le balisage schema.org Hotel + LocalBusiness sur la page d'accueil et les chambres",
      scenario_kind: "minimal",
      explanation: {
        relevance:
          "Sans schéma Hotel, les moteurs de recherche et les IA conversationnelles ne reconnaissent pas votre établissement de façon fiable.",
        problem_solved:
          "Visibilité dégradée dans Google, AI Overviews, Perplexity, ChatGPT search.",
        change:
          "Quelques blocs JSON-LD dans le `<head>` (nom, adresse, téléphone, étoiles, équipements, photos, prix).",
        benefit:
          "Meilleure interprétation par les moteurs AI; rich-snippets dans Google.",
        effort: "Faible — 1 à 2 heures pour un dev front, ou via plugin CMS.",
        risks: "Aucun si validé via le Schema Markup Validator.",
        check_before:
          "Vérifier la cohérence des informations (téléphone, email, horaires) entre site et Google Business Profile.",
        alternatives: ["Schéma via Google Tag Manager si pas d'accès code"],
        do_nothing_consequence:
          "Vos pages restent invisibles à la prochaine vague de moteurs AI-driven.",
      },
      signals: {
        answers: [],
        scan_findings: ["schema_hotel_present"],
        vendor_fields: [],
      },
      expected_effort: "low",
      expected_impact: "medium",
      priority: 15,
    },
    ctx,
  );
}

/** REC-04 — FAQ page. */
export function recFaqPage(ctx: RecommendationContext): RuleRecommendation | null {
  if (ctx.scanByField["faq_present"] === true) return null;
  return makeRec(
    {
      rule_id: "REC-04-faq-page",
      archetype: "faq_page",
      action:
        "Publier une page FAQ structurée (parking, breakfast, accès, late check-in, animaux, annulation)",
      scenario_kind: "balanced",
      explanation: {
        relevance:
          "Une FAQ publique réduit la charge réception et améliore la visibilité AI-search.",
        problem_solved:
          "Questions répétées avant réservation, hésitations à l'achat.",
        change:
          "10 à 20 questions au format Q&A avec balisage `FAQPage` JSON-LD.",
        benefit:
          "Réduction des emails/appels pré-séjour, conversion en hausse, visibilité moteurs.",
        effort: "Faible — 4 à 6 heures.",
        risks: "Risque de contenu obsolète si la FAQ n'est pas relue trimestriellement.",
        check_before: "Avoir la base de connaissances (REC-01) en place.",
        alternatives: [
          "Section FAQ sur la page d'accueil",
          "FAQ partagée via PDF/email pré-séjour",
        ],
        do_nothing_consequence:
          "Demandes répétitives qui continuent d'absorber du temps avant et pendant le séjour.",
      },
      signals: {
        answers: ["has_knowledge_base"],
        scan_findings: ["faq_present"],
        vendor_fields: [],
      },
      expected_effort: "low",
      expected_impact: "medium",
      priority: 30,
    },
    ctx,
  );
}

/** REC-05 — Guest messaging tool (only if eligible vendor exists). */
export function recGuestMessagingTool(ctx: RecommendationContext): RuleRecommendation[] {
  const eligible = eligibleGuestMessaging(ctx);
  if (eligible.length === 0) return [];
  // Surface up to two vendors at the balanced scenario.
  return eligible.slice(0, 2).map((e, i) =>
    makeRec(
      {
        rule_id: `REC-05-guest-messaging-${e.vendor.slug}`,
        archetype: "guest_messaging_tool",
        action: `Adopter ${e.vendor.slug} pour la communication guest (WhatsApp, email, sms unifiés)`,
        scenario_kind: "balanced",
        vendor: e.vendor,
        explanation: {
          relevance: `${e.reasons.join(" · ")} — fit profil hôtel.`,
          problem_solved:
            "Conversations guest éclatées entre boîte mail, WhatsApp, Booking.com inbox.",
          change:
            "Une seule boîte unifiée pour toute la communication guest, historisée par séjour.",
          benefit:
            "Temps de réponse divisé par 2 à 3; cohérence; suivi par séjour.",
          effort: "Moyen — 1 à 2 jours d'onboarding + intégration PMS (selon vendor).",
          risks:
            "Coût récurrent + dépendance à un sous-traitant; nécessite DPA.",
          check_before:
            "Vérifier intégration native avec le PMS actuel et la posture GDPR du vendor.",
          alternatives: ["WhatsApp Business + Gmail multi-libellés en première étape"],
          do_nothing_consequence:
            "Les conversations resteront fragmentées, la réception continuera de jongler.",
        },
        signals: {
          answers: ["uses_whatsapp", "response_time_sla_hours", "captures_guest_emails"],
          scan_findings: ["whatsapp_visible"],
          vendor_fields: [
            "languagesSupported",
            "gdprPosture",
            "euHosting",
            "frenchMarketRelevance",
            "integrations.pms",
          ],
        },
        expected_effort: "medium",
        expected_impact: "high",
        priority: 50 + i,
      },
      ctx,
    ),
  );
}

/** REC-06 — Review management tool. */
export function recReviewManagement(ctx: RecommendationContext): RuleRecommendation | null {
  if (ctx.project.goal_primary !== "reviews" && ctx.project.goal_primary !== "guest_satisfaction")
    return null;
  const eligible = eligibleReviewManagement(ctx);
  if (eligible.length === 0) return null;
  const e = eligible[0]!;
  return makeRec(
    {
      rule_id: `REC-06-review-mgmt-${e.vendor.slug}`,
      archetype: "review_management",
      action: `Mettre en place ${e.vendor.slug} pour centraliser et solliciter les avis`,
      scenario_kind: "balanced",
      vendor: e.vendor,
      explanation: {
        relevance: e.reasons.join(" · "),
        problem_solved:
          "Avis dispersés (Google, Booking, TripAdvisor); réponse aux avis irrégulière.",
        change:
          "Tableau de bord unique, sollicitation post-séjour automatique, alertes négatifs.",
        benefit: "Volume d'avis en hausse, note Google qui grimpe, time-to-respond divisé.",
        effort: "Faible — 1 jour de configuration.",
        risks: "Sollicitations excessives peuvent agacer; rester sobre.",
        check_before: "Confirmer un canal email valide pour la sollicitation post-séjour.",
        alternatives: ["Rappel manuel par email post-séjour"],
        do_nothing_consequence:
          "L'établissement reste invisible des moteurs guidés-par-réputation.",
      },
      signals: {
        answers: ["goal_primary", "captures_guest_emails"],
        scan_findings: [],
        vendor_fields: ["languagesSupported", "gdprPosture", "integrations"],
      },
      expected_effort: "low",
      expected_impact: "medium",
      priority: 60,
    },
    ctx,
  );
}

/** REC-07 — AI transparency notice. */
export function recAiTransparencyNotice(ctx: RecommendationContext): RuleRecommendation | null {
  if (isYes(ctx.answersByslug["uses_ai_in_guest_replies"]) && isNo(ctx.answersByslug["ai_transparency_notice"])) {
    return makeRec(
      {
        rule_id: "REC-07-ai-transparency",
        archetype: "ai_transparency_notice",
        action:
          "Ajouter une mention de transparence IA dans la politique de confidentialité et au premier contact",
        scenario_kind: "minimal",
        explanation: {
          relevance:
            "L'usage d'IA dans la communication guest sans information explicite expose à un risque RGPD / AI Act (transparence).",
          problem_solved: "Manque de transparence sur l'usage d'IA en réponse guest.",
          change:
            "Bandeau sur la page contact + paragraphe dans la politique de confidentialité.",
          benefit: "Mise en conformité; confiance guest renforcée.",
          effort: "Très faible — quelques heures avec votre conseil juridique.",
          risks: "Aucun.",
          check_before: "Faire relire la formulation par un conseil RGPD.",
          alternatives: ["Désactiver l'IA tant que la mention n'est pas en ligne"],
          do_nothing_consequence:
            "Exposition légale, perte de confiance si découvert par un guest.",
        },
        confidence: "high",
        signals: {
          answers: ["uses_ai_in_guest_replies", "ai_transparency_notice"],
          scan_findings: [],
          vendor_fields: [],
        },
        expected_effort: "low",
        expected_impact: "medium",
        priority: 5,
        recommended_owner: "hotelier",
      },
      ctx,
    );
  }
  return null;
}

/** REC-08 — DPA review for current vendors. */
export function recDpaReview(ctx: RecommendationContext): RuleRecommendation | null {
  const hasProcess = ctx.answersByslug["has_dpa_process"];
  if (isYes(hasProcess)) return null;
  return makeRec(
    {
      rule_id: "REC-08-dpa-review",
      archetype: "dpa_review",
      action:
        "Recenser tous les sous-traitants qui traitent des données guest et signer (ou demander) un DPA",
      scenario_kind: "balanced",
      explanation: {
        relevance:
          "Sans DPA en place, l'hôtel est juridiquement responsable des manquements de ses sous-traitants.",
        problem_solved: "Risque RGPD diffus, pas de cartographie des sous-traitants.",
        change:
          "Tableau de bord des sous-traitants (PMS, booking engine, CRM, messagerie) avec statut DPA + EU-hosting.",
        benefit: "Cartographie claire pour la CNIL en cas de contrôle.",
        effort: "Moyen — 1 à 2 jours pour collecter et signer.",
        risks: "Refus d'un vendor de signer un DPA → renégociation ou changement.",
        check_before:
          "Lister précisément les outils utilisés pour communiquer / stocker des données guest.",
        alternatives: ["Confier la tâche à un cabinet RGPD"],
        do_nothing_consequence: "Exposition légale en cas de contrôle CNIL.",
      },
      signals: {
        answers: ["has_dpa_process"],
        scan_findings: [],
        vendor_fields: ["gdprPosture", "euHosting"],
      },
      expected_effort: "medium",
      expected_impact: "medium",
      priority: 25,
      recommended_owner: "shared",
    },
    ctx,
  );
}

/** REC-09 — Direct-booking button fix. */
export function recDirectBookingButton(ctx: RecommendationContext): RuleRecommendation | null {
  if (ctx.scanByField["booking_button_target"] !== "external") return null;
  return makeRec(
    {
      rule_id: "REC-09-direct-booking-button",
      archetype: "website_revamp",
      action:
        "Réorienter le bouton 'Réserver' vers un moteur de réservation interne (avec cohérence tarifaire OTA)",
      scenario_kind: "balanced",
      explanation: {
        relevance:
          "Le bouton de réservation pointe vers un domaine externe — chaque conversion paie une commission.",
        problem_solved: "Fuite de marge vers OTA / agrégateurs tiers.",
        change: "Mise en place ou activation du moteur de réservation interne.",
        benefit: "Commissions économisées; meilleure data; meilleur lien guest.",
        effort: "Moyen — dépend du fournisseur de moteur de réservation.",
        risks:
          "Cannibalisation OTA si le tarif direct n'est pas compétitif; risque parité tarifaire.",
        check_before:
          "Vérifier la stratégie de parité tarifaire et la disponibilité technique du moteur.",
        alternatives: ["Lien moteur OTA en attendant un moteur direct"],
        do_nothing_consequence:
          "L'hôtel continue de payer 15–20 % de commission sur chaque réservation directe perdue.",
      },
      signals: {
        answers: [],
        scan_findings: ["booking_button_target", "lighthouse_performance_mobile"],
        vendor_fields: [],
      },
      expected_effort: "medium",
      expected_impact: "high",
      priority: 35,
    },
    ctx,
  );
}

/** REC-10 — WhatsApp Business setup (visibility). */
export function recWhatsappSetup(ctx: RecommendationContext): RuleRecommendation | null {
  if (ctx.scanByField["whatsapp_visible"] === true) return null;
  if (isYes(ctx.answersByslug["uses_whatsapp"])) {
    // Used but not visible — light recommendation to surface it.
    return makeRec(
      {
        rule_id: "REC-10-whatsapp-surface",
        archetype: "whatsapp_setup",
        action:
          "Rendre WhatsApp Business visible sur le site (lien wa.me sur header + pages contact / réservation)",
        scenario_kind: "minimal",
        explanation: {
          relevance:
            "WhatsApp est utilisé en interne mais invisible des visiteurs — vous payez le coût d'un canal sans en récolter les bénéfices SEO/conversion.",
          problem_solved: "Canal de communication utilisé mais sous-exploité.",
          change: "Lien `wa.me` + numéro affiché sur les 3 pages principales.",
          benefit: "Conversion en hausse, time-to-contact réduit.",
          effort: "Très faible — 1 heure.",
          risks: "Aucun.",
          check_before: "S'assurer d'un numéro WhatsApp Business dédié, pas perso.",
          alternatives: ["QR code dans la chambre uniquement"],
          do_nothing_consequence:
            "Le canal continue de bénéficier seulement aux guests déjà arrivés.",
        },
        signals: {
          answers: ["uses_whatsapp"],
          scan_findings: ["whatsapp_visible"],
          vendor_fields: [],
        },
        expected_effort: "low",
        expected_impact: "low",
        priority: 40,
      },
      ctx,
    );
  }
  return null;
}

/** REC-11 — Staff training. */
export function recStaffTraining(ctx: RecommendationContext): RuleRecommendation | null {
  const comfort = ctx.answersByslug["staff_tool_comfort"];
  if (typeof comfort !== "number" || comfort >= 4) return null;
  return makeRec(
    {
      rule_id: "REC-11-staff-training",
      archetype: "training",
      action:
        "Programmer 2 sessions de formation outils (PMS, messagerie, modèles de réponse, base de connaissances)",
      scenario_kind: "minimal",
      explanation: {
        relevance:
          "Le confort outils de l'équipe est bas — toute nouvelle automatisation rebondira sans formation.",
        problem_solved: "Sous-utilisation des outils existants.",
        change: "2 sessions de 90 minutes + un quick-reference partagé.",
        benefit: "Adoption des outils en hausse, charge réception en baisse.",
        effort: "Moyen — 1 à 2 demi-journées.",
        risks: "Aucun.",
        check_before: "Définir 3 KPIs simples avant/après (temps de réponse, taux d'IDK, etc.).",
        alternatives: ["Tutoriels vidéo internes 5 minutes"],
        do_nothing_consequence:
          "Les outils continueront d'être sous-utilisés, l'investissement reste enterré.",
      },
      signals: {
        answers: ["staff_tool_comfort"],
        scan_findings: [],
        vendor_fields: [],
      },
      expected_effort: "medium",
      expected_impact: "high",
      priority: 45,
      recommended_owner: "shared",
    },
    ctx,
  );
}

/** REC-12 — Email opt-in capture. */
export function recEmailOptIn(ctx: RecommendationContext): RuleRecommendation | null {
  if (isYes(ctx.answersByslug["captures_guest_emails"])) return null;
  return makeRec(
    {
      rule_id: "REC-12-email-opt-in",
      archetype: "crm_introduction",
      action:
        "Mettre en place un opt-in email avec consentement explicite sur les confirmations / check-in",
      scenario_kind: "balanced",
      explanation: {
        relevance:
          "Sans collecte d'email consentie, aucune relance, aucune fidélisation, aucun direct futur.",
        problem_solved: "Pas de canal direct vers la base guest historique.",
        change:
          "Case opt-in dans le moteur + email de confirmation + script d'accueil au check-in.",
        benefit: "Construction d'une audience pour relance / réassurance / fidélisation.",
        effort: "Faible — 2 à 4 heures.",
        risks: "Mauvais wording → consentement non valide juridiquement.",
        check_before: "Faire relire le wording par un conseil RGPD.",
        alternatives: ["Wifi captif avec opt-in", "Carte papier au check-in"],
        do_nothing_consequence:
          "L'établissement reste totalement dépendant des OTA pour reconvertir les guests.",
      },
      signals: {
        answers: ["captures_guest_emails", "marketing_strategy"],
        scan_findings: [],
        vendor_fields: [],
      },
      expected_effort: "low",
      expected_impact: "medium",
      priority: 55,
    },
    ctx,
  );
}

/** REC-13 — Distribution audit (only when many channels present). */
export function recDistributionAudit(ctx: RecommendationContext): RuleRecommendation | null {
  const channels = ctx.answersByslug["distribution_channels"];
  if (!Array.isArray(channels) || channels.length < 3) return null;
  return makeRec(
    {
      rule_id: "REC-13-distribution-audit",
      archetype: "channel_manager",
      action: "Auditer la cohérence multi-canal (parité tarifaire, calendrier, inventaire)",
      scenario_kind: "advanced",
      explanation: {
        relevance: `${channels.length} canaux distribués — risque de double-réservation et de parité tarifaire éclatée.`,
        problem_solved: "Drift tarifaire entre OTA, conflit d'inventaire.",
        change: "Audit + mise en place d'une règle de parité automatique.",
        benefit: "Moins d'erreurs de réservation, ranking OTA stabilisé.",
        effort: "Moyen — 1 jour d'audit + suivi mensuel.",
        risks: "Aucun.",
        check_before: "Confirmer l'accès admin à chaque OTA.",
        alternatives: ["Channel manager dédié (voir REC-14)"],
        do_nothing_consequence:
          "Risque continu de double-réservation et de dégradation du classement OTA.",
      },
      signals: {
        answers: ["distribution_channels"],
        scan_findings: [],
        vendor_fields: [],
      },
      expected_effort: "medium",
      expected_impact: "medium",
      priority: 70,
    },
    ctx,
  );
}

/** REC-14 — PMS evaluation (only on explicit goal). */
export function recPmsEvaluation(ctx: RecommendationContext): RuleRecommendation | null {
  if (ctx.project.goal_primary !== "pms_evaluation") return null;
  return makeRec(
    {
      rule_id: "REC-14-pms-evaluation",
      archetype: "pms_evaluation",
      action:
        "Conduire une évaluation comparative de 3 PMS adaptés à votre profil (indépendant, taille, budget)",
      scenario_kind: "advanced",
      explanation: {
        relevance:
          "Vous avez explicitement choisi 'évaluation PMS' comme objectif principal — cadrage formel justifié.",
        problem_solved: "PMS actuel inadapté / vieillissant / coûteux.",
        change: "Comparatif structuré (features, intégrations, GDPR, coût, support).",
        benefit: "Décision éclairée avec critères explicites, pas vendeur-driven.",
        effort: "Élevé — 3 à 5 jours répartis sur 6 semaines.",
        risks: "Migration mal préparée = mois d'instabilité opérationnelle.",
        check_before:
          "Lister les 5 fonctions critiques utilisées chaque jour avant la comparaison.",
        alternatives: ["Audit du PMS actuel + optimisation, sans changement"],
        do_nothing_consequence:
          "PMS reste un point de friction quotidien et freine les automatisations en aval.",
      },
      signals: {
        answers: ["goal_primary", "pms_vendor"],
        scan_findings: [],
        vendor_fields: ["category=pms"],
      },
      expected_effort: "high",
      expected_impact: "high",
      priority: 80,
      recommended_owner: "consultant",
    },
    ctx,
  );
}

/* ----------------------------- dispatcher ----------------------------- */

export function generatePositiveRecommendations(
  ctx: RecommendationContext,
): RuleRecommendation[] {
  const out: RuleRecommendation[] = [];
  const append = (r: RuleRecommendation | null) => {
    if (r) out.push(r);
  };
  const appendMany = (rs: RuleRecommendation[]) => out.push(...rs);

  append(recKnowledgeBase(ctx));
  append(recResponseTemplates(ctx));
  append(recSchemaMarkup(ctx));
  append(recFaqPage(ctx));
  appendMany(recGuestMessagingTool(ctx));
  append(recReviewManagement(ctx));
  append(recAiTransparencyNotice(ctx));
  append(recDpaReview(ctx));
  append(recDirectBookingButton(ctx));
  append(recWhatsappSetup(ctx));
  append(recStaffTraining(ctx));
  append(recEmailOptIn(ctx));
  append(recDistributionAudit(ctx));
  append(recPmsEvaluation(ctx));

  return out;
}
