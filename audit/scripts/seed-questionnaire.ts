/**
 * T108 — Seed the dynamic questionnaire.
 *
 * Inserts ~30 questions across the first 4 blocks (profile, goal, stack,
 * website) so the User Story 2 dynamic renderer has content to exercise.
 * The set covers all 8 answer types so the FieldRenderer dispatch is fully
 * exercised:
 *
 *  - single, multi, dropdown, slider, ranking, yes_no_unknown, short_text, voice
 *
 * Each question is created with:
 *  - `current_version = 1`,
 *  - `status = 'published'`,
 *  - FR + EN translations,
 *  - conditional logic where applicable (e.g. PMS deep-dive questions only
 *    show when a PMS vendor has been declared).
 *
 * Usage:  npm run db:seed:questionnaire
 *         npm run db:seed:questionnaire -- --reset    # wipe + re-insert
 */
/* eslint-disable no-console */

import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { createDbClient } from "../lib/db/client";
import {
  questions,
  questionVersions,
  questionTranslations,
  questionConditions,
  answers,
  voiceCaptures,
  type QuestionBlock,
  type AnswerType,
} from "../db/schema";

interface SeedQuestion {
  slug: string;
  block: QuestionBlock;
  answer_type: AnswerType;
  audit_levels: string[];
  hotel_types?: string[];
  goal_relevance?: string[];
  scoring_contributions?: Record<string, unknown>;
  definition: {
    required?: boolean;
    options?: string[];
    range?: { min: number; max: number; step?: number; unit?: string };
    maxItems?: number;
    topN?: number;
    maxLength?: number;
    maxDurationSeconds?: number;
  };
  conditions?: unknown[];
  fr: {
    prompt: string;
    helper?: string;
    option_labels?: Record<string, string>;
  };
  en: {
    prompt: string;
    helper?: string;
    option_labels?: Record<string, string>;
  };
}

const SEED: SeedQuestion[] = [
  /* ============================ Block 1 — profile =========================== */
  {
    slug: "property_type",
    block: "profile",
    answer_type: "single",
    audit_levels: ["mini", "full", "consultant_assisted"],
    scoring_contributions: { tool_stack_coherence: { weight: 0 } },
    definition: {
      required: true,
      options: ["independent", "boutique", "family", "aparthotel", "guesthouse", "small_group"],
    },
    fr: {
      prompt: "Quel type d’établissement gérez-vous ?",
      helper: "Choisissez la catégorie qui correspond le mieux.",
      option_labels: {
        independent: "Hôtel indépendant",
        boutique: "Hôtel boutique",
        family: "Hôtel familial",
        aparthotel: "Apparthotel / résidence",
        guesthouse: "Chambre d’hôtes / maison d’hôtes",
        small_group: "Petit groupe (2 à 5 propriétés)",
      },
    },
    en: {
      prompt: "What kind of property do you operate?",
      helper: "Pick the closest fit.",
      option_labels: {
        independent: "Independent hotel",
        boutique: "Boutique hotel",
        family: "Family hotel",
        aparthotel: "Aparthotel / serviced residence",
        guesthouse: "Guesthouse",
        small_group: "Small group (2–5 properties)",
      },
    },
  },
  {
    slug: "room_count",
    block: "profile",
    answer_type: "slider",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: { required: true, range: { min: 1, max: 200, step: 1, unit: "ch." } },
    fr: {
      prompt: "Combien de chambres compte l’établissement ?",
      helper: "Glissez jusqu’à votre nombre. Au-delà de 200, indiquez 200.",
    },
    en: {
      prompt: "How many rooms does the property have?",
      helper: "Drag to your number. For 200+ rooms, enter 200.",
    },
  },
  {
    slug: "star_rating",
    block: "profile",
    answer_type: "dropdown",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: {
      required: false,
      options: ["1", "2", "3", "4", "5", "unclassified"],
    },
    fr: {
      prompt: "Catégorie officielle (étoiles)",
      option_labels: {
        "1": "1 étoile",
        "2": "2 étoiles",
        "3": "3 étoiles",
        "4": "4 étoiles",
        "5": "5 étoiles",
        unclassified: "Non classé",
      },
    },
    en: {
      prompt: "Official category (stars)",
      option_labels: {
        "1": "1 star",
        "2": "2 stars",
        "3": "3 stars",
        "4": "4 stars",
        "5": "5 stars",
        unclassified: "Unclassified",
      },
    },
  },
  {
    slug: "contact_role",
    block: "profile",
    answer_type: "single",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: {
      required: true,
      options: ["owner", "manager", "front_office", "marketing", "external_consultant", "other"],
    },
    fr: {
      prompt: "Quel est votre rôle ?",
      option_labels: {
        owner: "Propriétaire",
        manager: "Direction / gérance",
        front_office: "Réception",
        marketing: "Marketing / commercial",
        external_consultant: "Consultant externe",
        other: "Autre",
      },
    },
    en: {
      prompt: "Your role?",
      option_labels: {
        owner: "Owner",
        manager: "Manager",
        front_office: "Front office",
        marketing: "Marketing / sales",
        external_consultant: "External consultant",
        other: "Other",
      },
    },
  },
  {
    slug: "city_short",
    block: "profile",
    answer_type: "short_text",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, maxLength: 120 },
    fr: { prompt: "Ville / localisation", helper: "Ex. : Paris 5e, Annecy, Saint-Tropez." },
    en: { prompt: "City / location", helper: "E.g. Paris 5th, Annecy, Saint-Tropez." },
  },

  /* ============================ Block 2 — goal =========================== */
  {
    slug: "primary_goal",
    block: "goal",
    answer_type: "multi",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: {
      required: true,
      maxItems: 3,
      options: [
        "profitability",
        "workload_reduction",
        "direct_bookings",
        "guest_satisfaction",
        "ai_readiness",
        "pms_evaluation",
        "reviews",
        "modernize",
      ],
    },
    fr: {
      prompt: "Objectifs principaux de l’audit",
      helper: "Sélectionnez jusqu’à 3 objectifs. Le premier coché sera traité comme prioritaire.",
      option_labels: {
        profitability: "Améliorer la rentabilité",
        workload_reduction: "Réduire la charge de travail",
        direct_bookings: "Augmenter les réservations directes",
        guest_satisfaction: "Améliorer l’expérience client",
        ai_readiness: "Se préparer à l’IA",
        pms_evaluation: "Évaluer mon PMS actuel",
        reviews: "Améliorer ma e-réputation",
        modernize: "Moderniser ma stack digitale",
      },
    },
    en: {
      prompt: "Primary audit goals",
      helper: "Select up to 3 goals. The first one ticked is treated as the leading priority.",
      option_labels: {
        profitability: "Improve profitability",
        workload_reduction: "Reduce workload",
        direct_bookings: "Grow direct bookings",
        guest_satisfaction: "Improve guest experience",
        ai_readiness: "Get AI-ready",
        pms_evaluation: "Evaluate my PMS",
        reviews: "Improve online reputation",
        modernize: "Modernize my digital stack",
      },
    },
  },
  {
    slug: "secondary_priorities",
    block: "goal",
    answer_type: "ranking",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "profitability",
        "workload_reduction",
        "direct_bookings",
        "guest_satisfaction",
        "ai_readiness",
        "reviews",
        "modernize",
      ],
      topN: 3,
    },
    fr: {
      prompt: "Classez vos 3 priorités secondaires (haut = plus important)",
      option_labels: {
        profitability: "Rentabilité",
        workload_reduction: "Charge de travail",
        direct_bookings: "Réservations directes",
        guest_satisfaction: "Expérience client",
        ai_readiness: "IA",
        reviews: "E-réputation",
        modernize: "Modernisation",
      },
    },
    en: {
      prompt: "Rank your 3 secondary priorities (top = most important)",
      option_labels: {
        profitability: "Profitability",
        workload_reduction: "Workload",
        direct_bookings: "Direct bookings",
        guest_satisfaction: "Guest experience",
        ai_readiness: "AI readiness",
        reviews: "Reputation",
        modernize: "Modernization",
      },
    },
  },
  {
    slug: "biggest_pain_voice",
    block: "goal",
    answer_type: "voice",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, maxDurationSeconds: 120 },
    fr: {
      prompt: "Qu’est-ce qui vous fait le plus perdre du temps ou de l’argent en ce moment ?",
      helper: "Vous pouvez répondre à voix haute ; la transcription est éditable avant validation.",
    },
    en: {
      prompt: "What costs you the most time or money right now?",
      helper: "You can answer aloud; the transcript is editable before submission.",
    },
  },
  {
    slug: "change_readiness",
    block: "goal",
    answer_type: "slider",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, range: { min: 1, max: 10, step: 1 } },
    fr: {
      prompt: "À quel point êtes-vous prêt(e) à changer d’outils dans les 6 prochains mois ?",
      helper: "1 = je veux le minimum de changement, 10 = je veux refondre la stack.",
    },
    en: {
      prompt: "How ready are you to change tools in the next 6 months?",
      helper: "1 = minimal change, 10 = full stack rebuild.",
    },
  },

  /* ============================ Block 3 — stack =========================== */
  {
    slug: "pms_vendor",
    block: "stack",
    answer_type: "dropdown",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: {
      required: false,
      // Alphabetized FR-market-leaning list. ASCII slugs only — option values
      // travel through URL forms + JSON commit payloads.
      options: [
        "amenitiz",
        "asterio",
        "cloudbeds",
        "d_edge",
        "medialog",
        "mews",
        "misterbooking",
        "octorate",
        "opera",
        "protel",
        "reservit",
        "roomraccoon",
        "thais",
        "vega",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Quel PMS utilisez-vous aujourd’hui ?",
      helper: "Choisissez « Aucun » si vous gérez vos chambres sans logiciel dédié, ou « Je ne sais pas » si vous n’êtes pas sûr.",
      option_labels: {
        amenitiz: "Amenitiz",
        asterio: "Asterio",
        cloudbeds: "Cloudbeds",
        d_edge: "D-EDGE",
        medialog: "Medialog",
        mews: "Mews",
        misterbooking: "Mister Booking",
        octorate: "Octorate",
        opera: "Oracle Opera / Opera Cloud",
        protel: "protel",
        reservit: "Reservit",
        roomraccoon: "RoomRaccoon",
        thais: "Thaïs",
        vega: "Vega",
        other: "Autre",
        none: "Aucun",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "Which PMS do you use today?",
      helper: "Pick “None” if you manage rooms without dedicated software, or “I don’t know” if unsure.",
      option_labels: {
        amenitiz: "Amenitiz",
        asterio: "Asterio",
        cloudbeds: "Cloudbeds",
        d_edge: "D-EDGE",
        medialog: "Medialog",
        mews: "Mews",
        misterbooking: "Mister Booking",
        octorate: "Octorate",
        opera: "Oracle Opera / Opera Cloud",
        protel: "protel",
        reservit: "Reservit",
        roomraccoon: "RoomRaccoon",
        thais: "Thaïs",
        vega: "Vega",
        other: "Other",
        none: "None",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "pms_satisfaction",
    block: "stack",
    answer_type: "slider",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, range: { min: 1, max: 10, step: 1 } },
    conditions: [
      // Show only when a real PMS vendor has been declared (i.e. not
      // "none" and not "i don't know").
      { all: [
        { not: { answer: "pms_vendor", op: "eq", value: "none" } },
        { not: { answer: "pms_vendor", op: "eq", value: "i_dont_know" } },
      ] },
    ],
    fr: {
      prompt: "Note de satisfaction de votre PMS actuel",
      helper: "1 = je veux en changer demain, 10 = parfaitement adapté.",
    },
    en: {
      prompt: "Satisfaction with your current PMS",
      helper: "1 = I want to switch tomorrow, 10 = perfect fit.",
    },
  },
  {
    slug: "channel_manager_vendor",
    block: "stack",
    answer_type: "dropdown",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "d_edge",
        "siteminder",
        "cubilis",
        "hotelrunner",
        "myallocator",
        "availpro",
        "rategain",
        "misterbooking",
        "vertical_booking",
        "erevmax",
        "myhotelpms_in_pms",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Channel manager",
      helper: "Si vous ne gérez qu’une seule plateforme de réservation, cochez « Aucun ».",
      option_labels: {
        d_edge: "D-EDGE",
        siteminder: "SiteMinder",
        cubilis: "Cubilis (Stardekk)",
        hotelrunner: "HotelRunner",
        myallocator: "MyAllocator",
        availpro: "Availpro",
        rategain: "RateGain",
        misterbooking: "Mister Booking",
        vertical_booking: "Vertical Booking",
        erevmax: "eRevMax",
        myhotelpms_in_pms: "Intégré au PMS",
        other: "Autre",
        none: "Aucun",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "Channel manager",
      helper: "If you only sell on a single platform, pick “None”.",
      option_labels: {
        d_edge: "D-EDGE",
        siteminder: "SiteMinder",
        cubilis: "Cubilis (Stardekk)",
        hotelrunner: "HotelRunner",
        myallocator: "MyAllocator",
        availpro: "Availpro",
        rategain: "RateGain",
        misterbooking: "Mister Booking",
        vertical_booking: "Vertical Booking",
        erevmax: "eRevMax",
        myhotelpms_in_pms: "Bundled with PMS",
        other: "Other",
        none: "None",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "booking_engine_vendor",
    block: "stack",
    answer_type: "dropdown",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "d_edge",
        "reservit",
        "misterbooking",
        "availpro",
        "siteminder",
        "cubilis",
        "vertical_booking",
        "bookassist",
        "hotello",
        "guestcentric",
        "amenitiz",
        "eviivo",
        "thinkreservations",
        "fastbooking",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Moteur de réservation",
      helper: "Le moteur intégré à votre site web pour les réservations directes.",
      option_labels: {
        d_edge: "D-EDGE",
        reservit: "Reservit",
        misterbooking: "Mister Booking",
        availpro: "Availpro",
        siteminder: "SiteMinder",
        cubilis: "Cubilis (Stardekk)",
        vertical_booking: "Vertical Booking",
        bookassist: "Bookassist",
        hotello: "Hotello",
        guestcentric: "GuestCentric",
        amenitiz: "Amenitiz",
        eviivo: "eviivo",
        thinkreservations: "ThinkReservations",
        fastbooking: "FastBooking",
        other: "Autre",
        none: "Aucun",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "Booking engine",
      helper: "The engine embedded on your website for direct bookings.",
      option_labels: {
        d_edge: "D-EDGE",
        reservit: "Reservit",
        misterbooking: "Mister Booking",
        availpro: "Availpro",
        siteminder: "SiteMinder",
        cubilis: "Cubilis (Stardekk)",
        vertical_booking: "Vertical Booking",
        bookassist: "Bookassist",
        hotello: "Hotello",
        guestcentric: "GuestCentric",
        amenitiz: "Amenitiz",
        eviivo: "eviivo",
        thinkreservations: "ThinkReservations",
        fastbooking: "FastBooking",
        other: "Other",
        none: "None",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "crm_vendor",
    block: "stack",
    answer_type: "dropdown",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "experience_hotel",
        "revinate",
        "cendyn",
        "guestrevu",
        "hubspot",
        "pipedrive",
        "salesforce",
        "zoho",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Outil CRM / fidélisation",
      helper: "L’outil qui centralise vos contacts clients et campagnes marketing.",
      option_labels: {
        experience_hotel: "Experience Hotel",
        revinate: "Revinate",
        cendyn: "Cendyn",
        guestrevu: "GuestRevu",
        hubspot: "HubSpot",
        pipedrive: "Pipedrive",
        salesforce: "Salesforce",
        zoho: "Zoho",
        other: "Autre",
        none: "Aucun",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "CRM / loyalty tool",
      helper: "The tool centralizing guest contacts and marketing campaigns.",
      option_labels: {
        experience_hotel: "Experience Hotel",
        revinate: "Revinate",
        cendyn: "Cendyn",
        guestrevu: "GuestRevu",
        hubspot: "HubSpot",
        pipedrive: "Pipedrive",
        salesforce: "Salesforce",
        zoho: "Zoho",
        other: "Other",
        none: "None",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "guest_messaging_vendor",
    block: "stack",
    answer_type: "dropdown",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "hijiffy",
        "quicktext",
        "asksuite",
        "akia",
        "easyway",
        "whistle",
        "duve",
        "operto",
        "cendyn_guestrev",
        "whatsapp_business",
        "manual_reception",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Messagerie client / concierge IA",
      helper: "Outils utilisés pour répondre aux questions des clients avant, pendant et après le séjour.",
      option_labels: {
        hijiffy: "HiJiffy",
        quicktext: "Quicktext",
        asksuite: "Asksuite",
        akia: "Akia",
        easyway: "EasyWay",
        whistle: "Whistle",
        duve: "Duve",
        operto: "Operto",
        cendyn_guestrev: "Cendyn Guestrev",
        whatsapp_business: "WhatsApp Business (sans plateforme dédiée)",
        manual_reception: "Réception manuelle (e-mail / téléphone)",
        other: "Autre",
        none: "Aucun",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "Guest messaging / AI concierge",
      helper: "Tools used to answer guest questions before, during, and after the stay.",
      option_labels: {
        hijiffy: "HiJiffy",
        quicktext: "Quicktext",
        asksuite: "Asksuite",
        akia: "Akia",
        easyway: "EasyWay",
        whistle: "Whistle",
        duve: "Duve",
        operto: "Operto",
        cendyn_guestrev: "Cendyn Guestrev",
        whatsapp_business: "WhatsApp Business (no dedicated platform)",
        manual_reception: "Manual reception (email / phone)",
        other: "Other",
        none: "None",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "review_management_vendor",
    block: "stack",
    answer_type: "dropdown",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "trustyou",
        "customer_alliance",
        "revinate",
        "guestrevu",
        "reviewpro",
        "mara_ai",
        "quicktext_reviews",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Outil de gestion des avis (e-réputation)",
      helper: "L’outil qui agrège et vous aide à répondre aux avis Tripadvisor / Booking / Google.",
      option_labels: {
        trustyou: "TrustYou",
        customer_alliance: "Customer Alliance",
        revinate: "Revinate",
        guestrevu: "GuestRevu",
        reviewpro: "ReviewPro",
        mara_ai: "MARA AI",
        quicktext_reviews: "Quicktext (module avis)",
        other: "Autre",
        none: "Aucun",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "Review management tool",
      helper: "The tool that aggregates Tripadvisor / Booking / Google reviews and helps you reply.",
      option_labels: {
        trustyou: "TrustYou",
        customer_alliance: "Customer Alliance",
        revinate: "Revinate",
        guestrevu: "GuestRevu",
        reviewpro: "ReviewPro",
        mara_ai: "MARA AI",
        quicktext_reviews: "Quicktext (reviews module)",
        other: "Other",
        none: "None",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "uses_whatsapp",
    block: "stack",
    answer_type: "yes_no_unknown",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: { required: false },
    fr: { prompt: "Utilisez-vous WhatsApp avec vos clients ?" },
    en: { prompt: "Do you use WhatsApp with guests?" },
  },
  {
    slug: "marketing_channels",
    block: "stack",
    answer_type: "multi",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: ["website", "google_ads", "meta_ads", "instagram_organic", "newsletter", "press", "partnerships"],
      maxItems: 5,
    },
    fr: {
      prompt: "Quels canaux marketing utilisez-vous activement ?",
      option_labels: {
        website: "Site web",
        google_ads: "Google Ads",
        meta_ads: "Facebook / Instagram Ads",
        instagram_organic: "Instagram (organique)",
        newsletter: "Newsletter",
        press: "Presse / RP",
        partnerships: "Partenariats locaux",
      },
    },
    en: {
      prompt: "Which marketing channels do you actively use?",
      option_labels: {
        website: "Website",
        google_ads: "Google Ads",
        meta_ads: "Facebook / Instagram Ads",
        instagram_organic: "Instagram (organic)",
        newsletter: "Newsletter",
        press: "Press / PR",
        partnerships: "Local partnerships",
      },
    },
  },

  /* ============================ Block 4 — website =========================== */
  {
    slug: "direct_booking_share",
    block: "website",
    answer_type: "slider",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, range: { min: 0, max: 100, step: 5, unit: "%" } },
    fr: {
      prompt: "Part des réservations directes (vs OTAs) — estimation",
      helper: "Glissez à votre approximation. Si vous ne savez pas, cochez « je ne sais pas ».",
    },
    en: {
      prompt: "Share of direct bookings (vs OTAs) — estimate",
      helper: "Drag to your approximation. If unsure, tick “I don’t know”.",
    },
  },
  {
    slug: "website_owner",
    block: "website",
    answer_type: "single",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: ["agency", "freelancer", "internal", "vendor_template", "unknown"],
    },
    fr: {
      prompt: "Qui gère votre site web aujourd’hui ?",
      option_labels: {
        agency: "Agence",
        freelancer: "Freelance",
        internal: "Équipe interne",
        vendor_template: "Template fourni par un vendeur (PMS / moteur)",
        unknown: "Je ne sais pas",
      },
    },
    en: {
      prompt: "Who manages your website today?",
      option_labels: {
        agency: "Agency",
        freelancer: "Freelancer",
        internal: "In-house team",
        vendor_template: "Vendor-provided template",
        unknown: "Unsure",
      },
    },
  },
  {
    slug: "website_provider",
    block: "website",
    answer_type: "dropdown",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: [
        "amenitiz",
        "eviivo",
        "guestcentric",
        "hotello",
        "squarespace",
        "wordpress",
        "wix",
        "webflow",
        "custom",
        "other",
        "none",
        "i_dont_know",
      ],
    },
    fr: {
      prompt: "Sur quelle technologie / plateforme votre site web est-il construit ?",
      helper: "Si le site a été fait sur-mesure par un développeur, choisissez « Site sur-mesure ».",
      option_labels: {
        amenitiz: "Amenitiz",
        eviivo: "eviivo",
        guestcentric: "GuestCentric",
        hotello: "Hotello",
        squarespace: "Squarespace",
        wordpress: "WordPress",
        wix: "Wix",
        webflow: "Webflow",
        custom: "Site sur-mesure (développeur dédié)",
        other: "Autre",
        none: "Pas de site web",
        i_dont_know: "Je ne sais pas",
      },
    },
    en: {
      prompt: "What platform is your website built on?",
      helper: "If a developer built it from scratch, pick “Custom build”.",
      option_labels: {
        amenitiz: "Amenitiz",
        eviivo: "eviivo",
        guestcentric: "GuestCentric",
        hotello: "Hotello",
        squarespace: "Squarespace",
        wordpress: "WordPress",
        wix: "Wix",
        webflow: "Webflow",
        custom: "Custom build (dedicated developer)",
        other: "Other",
        none: "No website",
        i_dont_know: "I don’t know",
      },
    },
  },
  {
    slug: "has_book_now_button",
    block: "website",
    answer_type: "yes_no_unknown",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: { required: false },
    fr: { prompt: "Votre site a-t-il un bouton « Réserver » visible en haut de chaque page ?" },
    en: { prompt: "Is there a visible “Book now” button at the top of every page?" },
  },
  {
    slug: "mobile_friction_voice",
    block: "website",
    answer_type: "voice",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, maxDurationSeconds: 90 },
    fr: {
      prompt: "Décrivez en 1 minute ce qui vous semble le plus frictionnel sur mobile pour vos clients.",
      helper: "Réponse libre — la transcription est éditable.",
    },
    en: {
      prompt: "In 1 minute, describe the biggest mobile friction your guests face.",
      helper: "Free-form — the transcript is editable.",
    },
  },
  {
    slug: "languages_offered",
    block: "website",
    answer_type: "multi",
    audit_levels: ["full", "consultant_assisted"],
    definition: {
      required: false,
      options: ["fr", "en", "de", "es", "it", "nl", "zh", "ja"],
    },
    fr: {
      prompt: "Quelles langues votre site propose-t-il ?",
      option_labels: {
        fr: "Français",
        en: "Anglais",
        de: "Allemand",
        es: "Espagnol",
        it: "Italien",
        nl: "Néerlandais",
        zh: "Chinois",
        ja: "Japonais",
      },
    },
    en: {
      prompt: "Which languages does your website offer?",
      option_labels: {
        fr: "French",
        en: "English",
        de: "German",
        es: "Spanish",
        it: "Italian",
        nl: "Dutch",
        zh: "Chinese",
        ja: "Japanese",
      },
    },
  },
  {
    slug: "fastest_path_to_book_seconds",
    block: "website",
    answer_type: "slider",
    audit_levels: ["full", "consultant_assisted"],
    definition: { required: false, range: { min: 5, max: 120, step: 5, unit: "s" } },
    fr: {
      prompt: "En combien de secondes peut-on réserver depuis votre site (estimation) ?",
      helper: "De l’ouverture du site à la confirmation de réservation.",
    },
    en: {
      prompt: "How many seconds does it take to book from your site (estimate)?",
      helper: "From landing on the site to booking confirmation.",
    },
  },
  {
    slug: "website_url_short",
    block: "website",
    answer_type: "short_text",
    audit_levels: ["mini", "full", "consultant_assisted"],
    definition: { required: false, maxLength: 200 },
    fr: { prompt: "URL de votre site web", helper: "Ex. : https://hotel-exemple.fr" },
    en: { prompt: "Website URL", helper: "E.g. https://hotel-example.com" },
  },
];

async function main() {
  const reset = process.argv.includes("--reset");
  const { db, pool } = createDbClient();

  try {
    if (reset) {
      console.log("[seed-questionnaire] --reset: deleting prior questions…");
      // Order matters because of FK constraints:
      //   voice_captures (CASCADE on answers)
      //   answers        (RESTRICT on question_versions)  ← must clear first
      //   question_versions (RESTRICT on questions)        ← cascades own translations + conditions
      //   questions
      // We clear `answers` rows that reference *seed* question_versions; we
      // leave any orphan rows (no question_version pinned) alone.
      const slugs = SEED.map((q) => q.slug);
      const seedQuestionIds = (
        await db.select({ id: questions.id })
          .from(questions)
          .where(inArray(questions.slug, slugs))
      ).map((r) => r.id);
      if (seedQuestionIds.length > 0) {
        const seedVersionIds = (
          await db.select({ id: questionVersions.id })
            .from(questionVersions)
            .where(inArray(questionVersions.questionId, seedQuestionIds))
        ).map((r) => r.id);
        if (seedVersionIds.length > 0) {
          // Drop voice_captures for answers pinned to these versions.
          const dependentAnswerIds = (
            await db
              .select({ id: answers.id })
              .from(answers)
              .where(inArray(answers.questionVersionId, seedVersionIds))
          ).map((r) => r.id);
          if (dependentAnswerIds.length > 0) {
            await db
              .delete(voiceCaptures)
              .where(inArray(voiceCaptures.answerId, dependentAnswerIds));
            await db.delete(answers).where(inArray(answers.id, dependentAnswerIds));
          }
        }
        // question_versions → cascades translations + conditions.
        await db
          .delete(questionVersions)
          .where(inArray(questionVersions.questionId, seedQuestionIds));
        await db.delete(questions).where(inArray(questions.id, seedQuestionIds));
      }
    }

    let inserted = 0;
    let skipped = 0;
    const now = new Date();

    for (const q of SEED) {
      const existing = await db
        .select()
        .from(questions)
        .where(eq(questions.slug, q.slug))
        .limit(1);
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const questionId = randomUUID();
      await db.insert(questions).values({
        id: questionId,
        slug: q.slug,
        block: q.block,
        answerType: q.answer_type,
        auditLevels: q.audit_levels,
        hotelTypes: q.hotel_types ?? null,
        goalRelevance: q.goal_relevance ?? null,
        scoringContributions: q.scoring_contributions ?? null,
        currentVersion: 1,
        status: "published",
        createdAt: now,
        updatedAt: now,
      });

      const versionId = randomUUID();
      await db.insert(questionVersions).values({
        id: versionId,
        questionId,
        version: 1,
        definitionJson: q.definition,
        publishedAt: now,
        publishedBy: null,
      });

      await db.insert(questionTranslations).values({
        questionVersionId: versionId,
        language: "fr",
        prompt: q.fr.prompt,
        helper: q.fr.helper ?? null,
        optionLabels: q.fr.option_labels ?? null,
        updatedAt: now,
      });
      await db.insert(questionTranslations).values({
        questionVersionId: versionId,
        language: "en",
        prompt: q.en.prompt,
        helper: q.en.helper ?? null,
        optionLabels: q.en.option_labels ?? null,
        updatedAt: now,
      });

      if (q.conditions && q.conditions.length > 0) {
        for (const expr of q.conditions) {
          await db.insert(questionConditions).values({
            id: randomUUID(),
            questionVersionId: versionId,
            expressionJson: expr as object,
          });
        }
      }

      inserted++;
      console.log(`[seed-questionnaire] + ${q.slug} (${q.answer_type})`);
    }

    console.log(`[seed-questionnaire] done. inserted=${inserted} skipped=${skipped}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(
    `[seed-questionnaire] ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
