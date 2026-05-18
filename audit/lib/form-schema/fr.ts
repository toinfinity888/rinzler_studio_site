/**
 * French copy keyed by field id (and section id).
 * Single locale in V1; structure ready for `en.ts` to land without
 * rendering changes (constitution Principle III).
 */

export interface FrEntry {
  label: string;
  help?: string;
  placeholder?: string;
  options?: Record<string, string>;
}

export const SECTION_TITLES: Record<string, { title: string; intro?: string }> = {
  s1: {
    title: "Aperçu de l'hôtel",
    intro: "Quelques informations de base pour que nous puissions situer votre établissement.",
  },
  s2: {
    title: "Stack logiciel actuel",
    intro:
      "Pour chaque catégorie d'outil, indiquez le fournisseur, le coût mensuel approximatif, et votre niveau de satisfaction. Tout est optionnel : passez ce que vous ne savez pas.",
  },
  s3: {
    title: "Opérations & flux de travail",
    intro:
      "Où votre équipe perd-elle le plus de temps ? Les sliders vont de \"très simple\" à \"très douloureux\".",
  },
  s4: {
    title: "Commercial & financier",
    intro: "Distribution, coûts, marketing, performance.",
  },
  s5: {
    title: "Expérience client",
    intro: "Du check-in au upsell, en passant par les avis et la communication.",
  },
  s6: {
    title: "Automatisation & modernisation",
    intro: "À quoi êtes-vous ouvert ? Aucune réponse n'est un engagement.",
  },
  s7: {
    title: "Priorités & contraintes",
    intro: "Pour calibrer une recommandation réaliste à votre contexte.",
  },
  s8: {
    title: "Commentaires libres",
    intro: "Tout ce que vous voulez ajouter — vision, inquiétudes, questions.",
  },
};

export const SYSTEM_LABELS: Record<string, { name: string; help?: string }> = {
  pms: {
    name: "PMS (Property Management System)",
    help: "Le logiciel central qui gère réservations, planning des chambres, facturation et historique client. Exemples : Mews, Opera, Apaleo, Cloudbeds.",
  },
  booking_engine: {
    name: "Booking engine (moteur de réservation)",
    help: "Le module qui permet la réservation directe sur votre site web (sans passer par Booking.com / Expedia).",
  },
  channel_manager: {
    name: "Channel manager",
    help: "Synchronise vos disponibilités et tarifs entre votre PMS et les OTAs (Booking, Expedia, etc.) pour éviter les doubles réservations.",
  },
  website_cms: {
    name: "CMS du site web",
    help: "WordPress, Webflow, plateforme propriétaire, etc.",
  },
  crm: {
    name: "CRM",
    help: "Outil de gestion de la relation client — segments, campagnes email, historique d'interactions.",
  },
  payment: {
    name: "Fournisseur de paiement",
    help: "Stripe, Adyen, Lyra, banques traditionnelles, etc.",
  },
  review_management: {
    name: "Gestion des avis",
    help: "Outils qui agrègent et permettent de répondre aux avis (Trustyou, Revinate, Customer Alliance, etc.).",
  },
  housekeeping: {
    name: "Outils de gouvernance / housekeeping",
    help: "Applications dédiées au planning des femmes/valets de chambre et au suivi de l'état des chambres.",
  },
  communication: {
    name: "Communication interne / clients",
    help: "WhatsApp, SMS, email transactionnel, messagerie d'équipe — tout ce qui sert à parler aux clients ou à l'équipe.",
  },
  other_operational: {
    name: "Autres outils opérationnels",
    help: "Tout autre logiciel métier important : F&B, comptabilité, RH, BI, etc.",
  },
};

export const SYSTEM_SUB_LABELS: Record<string, { label: string; help?: string }> = {
  provider: { label: "Fournisseur actuel", help: "Le nom du logiciel ou de l'éditeur." },
  monthly_cost: {
    label: "Coût mensuel (€)",
    help: "Approximation suffisante. Inclut licences et frais récurrents.",
  },
  contract_status: { label: "Statut du contrat" },
  satisfaction: { label: "Niveau de satisfaction" },
  frustrations: {
    label: "Principales frustrations",
    help: "Ce qui vous coûte du temps ou de l'argent au quotidien.",
  },
};

const HOTEL_TYPE_LABELS: Record<string, string> = {
  boutique: "Boutique-hôtel",
  independent: "Hôtel indépendant",
  chain: "Hôtel de chaîne",
  luxury: "Luxe / palace",
  midscale: "Milieu de gamme",
  economy: "Économique",
  resort: "Resort / vacances",
  bnb: "B&B / chambres d'hôtes",
  aparthotel: "Apparthôtel / résidence",
  other: "Autre",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _CONTRACT_STATUS_LABELS: Record<string, string> = {
  month_to_month: "Mensuel reconductible",
  annual: "Annuel",
  multi_year: "Pluriannuel",
  expired: "Expiré / hors contrat",
  unknown: "Je ne sais pas",
};

const SATISFACTION_LABELS: Record<string, string> = {
  very_unsatisfied: "Très insatisfait",
  unsatisfied: "Insatisfait",
  neutral: "Neutre",
  satisfied: "Satisfait",
  very_satisfied: "Très satisfait",
};

const OTA_LABELS: Record<string, string> = {
  booking_com: "Booking.com",
  expedia: "Expedia / Hotels.com",
  airbnb: "Airbnb",
  hotelbeds: "Hotelbeds",
  agoda: "Agoda",
  google_hotel_ads: "Google Hotel Ads",
  other: "Autre",
};

const MARKETING_LABELS: Record<string, string> = {
  seo: "Référencement naturel (SEO)",
  sea_google_ads: "SEA / Google Ads",
  social_paid: "Réseaux sociaux payants",
  social_organic: "Réseaux sociaux organiques",
  email_crm: "Emailing / CRM",
  ota_visibility: "Visibilité OTAs (Booking, etc.)",
  pr_press: "Relations presse",
  partnerships: "Partenariats / co-marketing",
  none_significant: "Aucun canal significatif",
};

const MESSAGING_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  in_app: "App / portail dédié",
  phone: "Téléphone",
  front_desk_only: "Réception uniquement",
};

const BUDGET_LABELS: Record<string, string> = {
  very_tight: "Très serré",
  moderate: "Modéré",
  comfortable: "Confortable",
  open: "Ouvert / non plafonné",
};

const TIMELINE_LABELS: Record<string, string> = {
  asap_under_3m: "ASAP, moins de 3 mois",
  "3_to_6m": "3 à 6 mois",
  "6_to_12m": "6 à 12 mois",
  over_12m: "Plus de 12 mois",
  exploratory: "Phase exploratoire — pas de calendrier",
};

const PACE_LABELS: Record<string, string> = {
  fast: "Rapide / big bang",
  phased: "Par phases",
  cautious: "Lent et prudent",
};

const RESISTANCE_LABELS: Record<string, string> = {
  none: "Aucune",
  low: "Faible",
  moderate: "Modérée",
  high: "Forte",
};

const YES_NO_UNKNOWN_LABELS: Record<string, string> = {
  yes: "Oui",
  no: "Non",
  unknown: "Je ne sais pas",
};

const INTEREST_LABELS: Record<string, string> = {
  not_interested: "Pas intéressé",
  curious: "Curieux",
  interested: "Intéressé",
  very_interested: "Très intéressé",
};

const SLIDER_POLE_LABELS: Record<string, string> = {
  very_easy: "Très simple",
  very_painful: "Très douloureux",
};

export const FR: Record<string, FrEntry> = {
  /* SECTION 1 */
  "s1.hotel_name": { label: "Nom de l'hôtel", placeholder: "Hôtel des Voyageurs" },
  "s1.hotel_type": {
    label: "Type d'établissement",
    options: HOTEL_TYPE_LABELS,
  },
  "s1.number_of_rooms": { label: "Nombre de chambres", placeholder: "42" },
  "s1.location": { label: "Ville / localisation", placeholder: "Lyon, France" },
  "s1.main_contact_name": { label: "Nom du contact principal" },
  "s1.contact_email": { label: "Email du contact", placeholder: "contact@votrehotel.fr" },
  "s1.website_url": { label: "URL du site web", placeholder: "https://www.votrehotel.fr" },
  "s1.star_rating": { label: "Catégorie (étoiles)" },
  "s1.average_occupancy_pct": {
    label: "Taux d'occupation moyen (%)",
    placeholder: "65",
  },
  "s1.adr_eur": {
    label: "ADR moyen (€)",
    help: "Average Daily Rate — prix moyen par chambre vendue par nuit, hors taxes.",
    placeholder: "120",
  },
  "s1.number_of_employees": { label: "Nombre d'employés", placeholder: "12" },
  "s1.positioning_description": {
    label: "Positionnement / promesse",
    placeholder: "En quelques phrases : votre proposition de valeur, votre clientèle cible.",
  },

  /* SECTION 3 */
  "s3.most_manual_operations": {
    label: "Quelles opérations sont aujourd'hui les plus manuelles ?",
  },
  "s3.most_time_consuming_tasks": {
    label: "Quelles tâches répétitives consomment le plus de temps de l'équipe ?",
  },
  "s3.management_intervention_areas": {
    label: "Quels processus dépendent fortement d'une intervention managériale ?",
  },
  "s3.error_prone_processes": {
    label: "Quels processus génèrent le plus d'erreurs ?",
  },
  "s3.repetitive_guest_communication": {
    label: "Quelles communications client sont les plus répétitives ?",
  },
  "s3.outdated_areas": {
    label: "Quels domaines opérationnels vous semblent dépassés ?",
  },
  "s3.systems_disconnected": {
    label: "Quels systèmes ne communiquent pas correctement entre eux ?",
  },
  "s3.difficulty_check_in": {
    label: "Difficulté ressentie : check-in / check-out",
    options: SLIDER_POLE_LABELS,
  },
  "s3.difficulty_billing": {
    label: "Difficulté ressentie : facturation",
    options: SLIDER_POLE_LABELS,
  },
  "s3.difficulty_inventory_sync": {
    label: "Difficulté ressentie : synchronisation des disponibilités",
    options: SLIDER_POLE_LABELS,
  },
  "s3.difficulty_reporting": {
    label: "Difficulté ressentie : reporting / pilotage",
    options: SLIDER_POLE_LABELS,
  },

  /* SECTION 4 */
  "s4.ota_dependency_pct": {
    label: "Dépendance OTA (%)",
    help: "Part de votre chiffre d'affaires hébergement qui transite par les OTAs (Booking, Expedia, Airbnb, etc.).",
  },
  "s4.main_otas": {
    label: "Principales plateformes OTA utilisées",
    help: "Sélectionnez toutes celles qui s'appliquent.",
    options: OTA_LABELS,
  },
  "s4.direct_booking_challenges": {
    label: "Quels sont vos principaux défis sur la réservation directe ?",
  },
  "s4.estimated_monthly_software_cost_eur": {
    label: "Coût mensuel total des logiciels (€)",
  },
  "s4.biggest_operational_costs": { label: "Vos plus gros postes de coûts opérationnels" },
  "s4.marketing_channels": {
    label: "Canaux marketing actuels",
    options: MARKETING_LABELS,
  },
  "s4.website_performance_satisfaction": {
    label: "Satisfaction vis-à-vis de la performance de votre site",
    options: SATISFACTION_LABELS,
  },
  "s4.biggest_revenue_frustrations": {
    label: "Vos plus grandes frustrations côté revenu",
  },

  /* SECTION 5 */
  "s5.checkin_checkout_process": {
    label: "Décrivez votre processus de check-in / check-out actuel",
  },
  "s5.self_checkin_available": {
    label: "Avez-vous une option de check-in autonome ?",
    options: YES_NO_UNKNOWN_LABELS,
  },
  "s5.guest_communication_process": {
    label: "Comment communiquez-vous avec les clients avant/pendant/après leur séjour ?",
  },
  "s5.complaint_patterns": { label: "Quels sont les motifs de plaintes les plus fréquents ?" },
  "s5.review_management_process": { label: "Comment gérez-vous les avis en ligne ?" },
  "s5.personalization_capabilities": {
    label: "Quelles sont vos capacités actuelles de personnalisation client ?",
  },
  "s5.upsell_process": { label: "Comment fonctionne votre processus d'upsell ?" },
  "s5.messaging_channels": {
    label: "Canaux de messagerie utilisés avec les clients",
    options: MESSAGING_LABELS,
  },

  /* SECTION 6 */
  "s6.interest_in_automation": {
    label: "Intérêt pour l'automatisation en général",
    options: INTEREST_LABELS,
  },
  "s6.interest_in_ai_assisted_ops": {
    label: "Intérêt pour des opérations assistées par IA",
    options: INTEREST_LABELS,
  },
  "s6.openness_to_pms_migration": {
    label: "Ouverture à une migration de PMS",
    options: INTEREST_LABELS,
  },
  "s6.interest_reduce_manual_workload": {
    label: "Intérêt pour réduire la charge de travail manuelle",
    options: INTEREST_LABELS,
  },
  "s6.interest_grow_direct_bookings": {
    label: "Intérêt pour augmenter les réservations directes",
    options: INTEREST_LABELS,
  },
  "s6.interest_operational_reporting": {
    label: "Intérêt pour un reporting opérationnel automatisé",
    options: INTEREST_LABELS,
  },
  "s6.interest_staff_reduction_via_automation": {
    label: "Intérêt pour réduire les effectifs grâce à l'automatisation",
    options: INTEREST_LABELS,
  },
  "s6.modernization_goals": {
    label: "Vos objectifs de modernisation, dans vos mots",
  },

  /* SECTION 7 */
  "s7.budget_sensitivity": { label: "Sensibilité budgétaire", options: BUDGET_LABELS },
  "s7.timeline_expectation": { label: "Horizon de temps souhaité", options: TIMELINE_LABELS },
  "s7.operational_constraints": {
    label: "Contraintes opérationnelles à connaître",
  },
  "s7.existing_vendor_commitments": {
    label: "Engagements fournisseur existants",
  },
  "s7.modernization_concerns": {
    label: "Vos plus grandes inquiétudes concernant une modernisation",
  },
  "s7.internal_resistance_to_change": {
    label: "Résistance interne au changement",
    options: RESISTANCE_LABELS,
  },
  "s7.preferred_implementation_pace": {
    label: "Rythme de mise en œuvre préféré",
    options: PACE_LABELS,
  },

  /* SECTION 8 */
  "s8.open_comments": {
    label: "Commentaires libres",
    placeholder:
      "Préoccupations supplémentaires, objectifs, vision stratégique, questions à poser au consultant.",
  },
};
