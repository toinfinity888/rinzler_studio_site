/**
 * T117 — Funding-brief generator.
 *
 * Pure derivation from audit data: project + hotel + answers + the latest
 * published report snapshot (if any). Produces the structured
 * `FundingBriefContent` defined in `./types`. Pre-fills wherever possible
 * (FR-061); flags remaining gaps under `missing_inputs`.
 *
 * No external calls. No Bedrock. The function is synchronous and pure
 * given its inputs, so it can be unit-tested without DB plumbing.
 */
import type {
  BudgetBand,
  CompanyInfoSection,
  DocumentChecklistItem,
  FundingBriefAdditionalInputs,
  FundingBriefContent,
  MissingInput,
  ObjectiveBullet,
  ProjectDescriptionSection,
  RoadmapHorizon,
} from "./types";
import { FUNDING_DISCLAIMER_FR, FUNDING_DISCLAIMER_EN } from "./types";

type Lang = "fr" | "en";

export interface BriefGeneratorInput {
  language: Lang;
  hotel: {
    name: string | null;
    property_type: string | null;
    room_count: number | null;
    star_rating: number | null;
    city: string | null;
    region: string | null;
    country: string | null;
  };
  project: {
    contact_email: string | null;
    goal_primary: string | null;
    goal_secondary: string[];
    budget_level: string | null;
  };
  /** Subset of answer slugs we use to colour the project description. */
  answers: Record<string, unknown>;
  /** The rendered_json of the latest published report_snapshot, or null. */
  reportRendered: {
    recommendations?: Array<{
      id: string;
      action: string;
      impact?: { cost_band?: string };
    }>;
    roadmap?: {
      immediate?: Array<{ recommendation_id: string }>;
      thirty_day?: Array<{ recommendation_id: string }>;
      sixty_day?: Array<{ recommendation_id: string }>;
      ninety_day?: Array<{ recommendation_id: string }>;
    };
    readiness_scores?: Array<{ dimension: string; value: number }>;
  } | null;
  additionalInputs?: FundingBriefAdditionalInputs;
}

/* ------------------------------------------------------------------ */
/* Static lookups                                                      */
/* ------------------------------------------------------------------ */

const PROPERTY_TYPE_LABEL_FR: Record<string, string> = {
  independent: "hôtel indépendant",
  boutique: "hôtel boutique",
  family: "hôtel familial",
  aparthotel: "apparthôtel / résidence",
  guesthouse: "maison d'hôtes",
  small_group: "petit groupe hôtelier",
};
const PROPERTY_TYPE_LABEL_EN: Record<string, string> = {
  independent: "independent hotel",
  boutique: "boutique hotel",
  family: "family hotel",
  aparthotel: "aparthotel / residence",
  guesthouse: "guesthouse",
  small_group: "small hotel group",
};

const GOAL_LABEL_FR: Record<string, string> = {
  profitability: "améliorer la rentabilité",
  workload_reduction: "réduire la charge de travail",
  direct_bookings: "augmenter les réservations directes",
  guest_satisfaction: "améliorer l'expérience client",
  ai_readiness: "se préparer à l'adoption de l'IA",
  pms_evaluation: "évaluer le PMS actuel",
  reviews: "améliorer la e-réputation",
  modernize: "moderniser la stack digitale",
};
const GOAL_LABEL_EN: Record<string, string> = {
  profitability: "improve profitability",
  workload_reduction: "reduce operational workload",
  direct_bookings: "grow direct bookings",
  guest_satisfaction: "improve guest experience",
  ai_readiness: "prepare for AI adoption",
  pms_evaluation: "evaluate the current PMS",
  reviews: "improve online reputation",
  modernize: "modernise the digital stack",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function pickLang<T>(lang: Lang, fr: T, en: T): T {
  return lang === "fr" ? fr : en;
}

function asStringArray(input: unknown): string[] {
  if (Array.isArray(input)) return input.filter((s): s is string => typeof s === "string");
  if (typeof input === "string" && input.trim()) return [input];
  return [];
}

/* ------------------------------------------------------------------ */
/* Section builders                                                    */
/* ------------------------------------------------------------------ */

function buildCompanyInfo(args: BriefGeneratorInput): CompanyInfoSection {
  const contactRoleRaw = args.answers["contact_role"];
  return {
    hotel_name: args.hotel.name,
    property_type: args.hotel.property_type,
    room_count: args.hotel.room_count,
    star_rating: args.hotel.star_rating,
    address_city: args.hotel.city,
    address_region: args.hotel.region,
    address_country: args.hotel.country,
    contact_email: args.project.contact_email,
    contact_role: typeof contactRoleRaw === "string" ? contactRoleRaw : null,
  };
}

function buildProjectDescription(args: BriefGeneratorInput): ProjectDescriptionSection {
  const { language: lang, hotel, project } = args;
  const propLabel =
    (lang === "fr" ? PROPERTY_TYPE_LABEL_FR : PROPERTY_TYPE_LABEL_EN)[
      hotel.property_type ?? ""
    ] ?? pickLang(lang, "établissement hôtelier", "hospitality property");
  const rooms = hotel.room_count ?? "—";
  const city = hotel.city ?? pickLang(lang, "ville non renseignée", "city not provided");

  const goals = [
    project.goal_primary,
    ...(project.goal_secondary ?? []),
  ].filter((g): g is string => Boolean(g));
  const goalLabels = goals.map(
    (g) => (lang === "fr" ? GOAL_LABEL_FR : GOAL_LABEL_EN)[g] ?? g,
  );

  const oneLine = pickLang(
    lang,
    `Modernisation digitale d'un ${propLabel} de ${rooms} chambres à ${city}.`,
    `Digital modernisation of a ${propLabel} with ${rooms} rooms in ${city}.`,
  );

  const paragraph =
    goalLabels.length > 0
      ? pickLang(
          lang,
          `Ce projet vise à ${goalLabels.join(", ")}. Il s'inscrit dans une démarche de transformation numérique progressive — structuration des données guest, automatisation des tâches répétitives, amélioration de la visibilité en recherche guidée par IA, et préparation à l'adoption d'outils d'IA générative dans le respect du RGPD.`,
          `This project aims to ${goalLabels.join(", ")}. It is part of a progressive digital-transformation effort — structuring guest data, automating repetitive tasks, improving AI-driven search visibility, and preparing for compliant adoption of generative-AI tooling.`,
        )
      : pickLang(
          lang,
          "Modernisation et structuration du dispositif digital de l'établissement.",
          "Modernisation and structuring of the property's digital stack.",
        );

  return { one_line: oneLine, paragraph };
}

function buildDigitalGoals(args: BriefGeneratorInput): ObjectiveBullet[] {
  const lang = args.language;
  const goals: ObjectiveBullet[] = [];
  const declared = [
    args.project.goal_primary,
    ...(args.project.goal_secondary ?? []),
  ].filter((g): g is string => Boolean(g));

  for (const g of declared) {
    const label = (lang === "fr" ? GOAL_LABEL_FR : GOAL_LABEL_EN)[g] ?? g;
    let detail = "";
    switch (g) {
      case "workload_reduction":
        detail = pickLang(
          lang,
          "Réduction des saisies manuelles à la réception via templates, FAQ et messagerie guest unifiée.",
          "Reduce manual reception work via templates, FAQ, and unified guest messaging.",
        );
        break;
      case "direct_bookings":
        detail = pickLang(
          lang,
          "Améliorer le tunnel de réservation directe et les contenus de page d'accueil pour réduire la dépendance OTA.",
          "Improve the direct-booking funnel and homepage content to reduce OTA dependency.",
        );
        break;
      case "guest_satisfaction":
        detail = pickLang(
          lang,
          "Accélérer les réponses pré-arrivée et garantir la cohérence des informations diffusées.",
          "Speed up pre-arrival responses and ensure consistency of information shared with guests.",
        );
        break;
      case "ai_readiness":
        detail = pickLang(
          lang,
          "Structurer la base de connaissance hôtelière (FAQ, procédures) pour qu'un agent IA puisse y répondre avec gouvernance.",
          "Structure the hotel knowledge base (FAQ, SOPs) so an AI agent can answer with proper governance.",
        );
        break;
      case "modernize":
      case "pms_evaluation":
        detail = pickLang(
          lang,
          "Évaluer la cohérence et l'intégration de la stack outils existante (PMS, channel manager, CRM).",
          "Assess coherence and integration of the existing tool stack (PMS, channel manager, CRM).",
        );
        break;
      default:
        detail = pickLang(lang, "Détail à préciser avec le consultant.", "Detail to be refined with the consultant.");
    }
    goals.push({ label, detail });
  }
  return goals;
}

function buildAiDataObjectives(args: BriefGeneratorInput): ObjectiveBullet[] {
  const lang = args.language;
  const out: ObjectiveBullet[] = [];

  const aiReadinessScore = args.reportRendered?.readiness_scores?.find(
    (s) => s.dimension === "ai_search",
  )?.value;

  out.push({
    label: pickLang(lang, "Structurer le contenu hôtelier pour les moteurs IA", "Structure hotel content for AI-driven search"),
    detail: pickLang(
      lang,
      `Ajouter le balisage schema.org Hotel + LocalBusiness, structurer une FAQ couvrant les questions guest récurrentes. ${
        typeof aiReadinessScore === "number"
          ? `Score actuel de visibilité IA : ${aiReadinessScore}/100.`
          : ""
      }`,
      `Add schema.org Hotel + LocalBusiness markup; build a structured FAQ. ${
        typeof aiReadinessScore === "number"
          ? `Current AI-search readiness score: ${aiReadinessScore}/100.`
          : ""
      }`,
    ),
  });

  out.push({
    label: pickLang(lang, "Constituer une base de connaissance hôtelière", "Build a structured hotel knowledge base"),
    detail: pickLang(
      lang,
      "Centraliser pré-arrivée, accès, breakfast, parking, late check-in, facturation, demandes spéciales — réutilisable par templates, FAQ web, WhatsApp, et un éventuel agent IA.",
      "Centralise pre-arrival, access, breakfast, parking, late check-in, billing, and special requests — reusable across templates, web FAQ, WhatsApp, and a future AI agent.",
    ),
  });

  out.push({
    label: pickLang(lang, "Mettre en conformité l'usage de l'IA", "Compliant AI usage"),
    detail: pickLang(
      lang,
      "Politique interne d'usage de l'IA, mention de transparence guest si un agent IA répond, DPA avec chaque vendor traitant des données guest, hébergement UE vérifié.",
      "Internal AI-usage policy, guest-transparency notice when an AI agent replies, DPAs with every guest-data vendor, EU hosting verified.",
    ),
  });

  return out;
}

function buildExpectedBenefits(args: BriefGeneratorInput): ObjectiveBullet[] {
  const lang = args.language;
  const out: ObjectiveBullet[] = [];

  out.push({
    label: pickLang(lang, "Réduction du temps de traitement guest", "Reduced guest-handling time"),
    detail: pickLang(
      lang,
      "Templates + FAQ structurée + canaux unifiés visent une baisse mesurable des allers-retours pré-arrivée.",
      "Templates + structured FAQ + unified channels target a measurable drop in pre-arrival back-and-forth.",
    ),
  });
  out.push({
    label: pickLang(lang, "Augmentation des réservations directes", "Higher direct bookings"),
    detail: pickLang(
      lang,
      "Tunnel de réservation amélioré + visibilité IA renforcée + contenu d'incitation à la réservation directe.",
      "Improved booking funnel + stronger AI visibility + direct-booking incentive content.",
    ),
  });
  out.push({
    label: pickLang(lang, "Cohérence et résilience opérationnelle", "Operational coherence and resilience"),
    detail: pickLang(
      lang,
      "Procédures documentées + base de connaissance partagée réduisent la dépendance aux savoirs individuels et facilitent l'onboarding.",
      "Documented procedures + shared knowledge base reduce dependence on individual know-how and ease onboarding.",
    ),
  });

  return out;
}

function buildRoadmap(args: BriefGeneratorInput): RoadmapHorizon[] {
  const rendered = args.reportRendered;
  if (!rendered?.roadmap || !rendered?.recommendations) return [];

  const recsById = new Map(rendered.recommendations.map((r) => [r.id, r]));
  const horizons: RoadmapHorizon[] = [];
  const buckets: Array<{ key: "thirty_day" | "sixty_day" | "ninety_day"; horizon: "30d" | "60d" | "90d" }> = [
    { key: "thirty_day", horizon: "30d" },
    { key: "sixty_day", horizon: "60d" },
    { key: "ninety_day", horizon: "90d" },
  ];
  for (const b of buckets) {
    const items = rendered.roadmap[b.key] ?? [];
    horizons.push({
      horizon: b.horizon,
      actions: items
        .map((it) => recsById.get(it.recommendation_id)?.action)
        .filter((s): s is string => Boolean(s)),
    });
  }
  return horizons;
}

function buildBudget(args: BriefGeneratorInput): { bands: BudgetBand[]; notes: string } {
  const rendered = args.reportRendered;
  const lang = args.language;
  if (!rendered?.roadmap || !rendered?.recommendations) {
    return {
      bands: [],
      notes: pickLang(
        lang,
        "Le budget sera précisé à la sélection d'outils. Les fourchettes ci-dessous sont indicatives et excluent les coûts internes (temps équipe, formation).",
        "Budget will firm up once vendors are selected. Bands below are indicative and exclude internal costs (team time, training).",
      ),
    };
  }

  const recsById = new Map(rendered.recommendations.map((r) => [r.id, r]));
  const bands: BudgetBand[] = [];
  const bucketsMap: Array<{ key: "thirty_day" | "sixty_day" | "ninety_day"; bucket: "30d" | "60d" | "90d" }> = [
    { key: "thirty_day", bucket: "30d" },
    { key: "sixty_day", bucket: "60d" },
    { key: "ninety_day", bucket: "90d" },
  ];

  for (const b of bucketsMap) {
    const items = rendered.roadmap[b.key] ?? [];
    const counts: Record<string, { n: number; examples: string[] }> = {};
    for (const it of items) {
      const r = recsById.get(it.recommendation_id);
      const cb = r?.impact?.cost_band;
      const band: BudgetBand["cost_band"] = (
        cb === "entry" || cb === "mid" || cb === "premium" || cb === "variable"
          ? cb
          : "unknown"
      );
      counts[band] = counts[band] ?? { n: 0, examples: [] };
      counts[band].n++;
      if (r && counts[band].examples.length < 2) counts[band].examples.push(r.action);
    }
    for (const [cost_band, info] of Object.entries(counts)) {
      bands.push({
        bucket: b.bucket,
        cost_band: cost_band as BudgetBand["cost_band"],
        count: info.n,
        examples: info.examples,
      });
    }
  }

  return {
    bands,
    notes: pickLang(
      lang,
      "Bandes de coût indicatives par vendor : entry < 100€/mois · mid 100-500€/mois · premium > 500€/mois · variable = forfait à négocier. Les actions d'optimisation interne (contenu, procédures, formation) sont incluses dans le temps équipe et non chiffrées ici.",
      "Indicative cost bands per vendor: entry < €100/mo · mid €100-500/mo · premium > €500/mo · variable = negotiated. Internal optimisation work (content, procedures, training) is included in team time and not priced here.",
    ),
  };
}

function buildDocumentChecklist(args: BriefGeneratorInput): DocumentChecklistItem[] {
  const lang = args.language;
  const isFR = (args.hotel.country ?? "").toUpperCase() === "FR";
  const items: DocumentChecklistItem[] = [];

  if (isFR) {
    items.push({
      doc: pickLang(lang, "Extrait Kbis (< 3 mois)", "Kbis extract (< 3 months old)"),
      why: pickLang(
        lang,
        "Identification légale de l'entreprise — exigée par la plupart des programmes français de soutien à la transformation digitale.",
        "Legal company identification — required by most French digital-transformation support programmes.",
      ),
      who_provides: "hotelier",
    });
    items.push({
      doc: pickLang(lang, "Numéro SIRET", "SIRET number"),
      why: pickLang(
        lang,
        "Identifiant unique de l'établissement (le SIRET de l'hôtel, pas du siège si différent).",
        "Unique establishment identifier (use the hotel's SIRET, not headquarters if different).",
      ),
      who_provides: "hotelier",
    });
    items.push({
      doc: pickLang(lang, "Liasse fiscale ou bilans des 2 derniers exercices", "Last 2 years of financial statements"),
      why: pickLang(
        lang,
        "Capacité d'autofinancement et part de cofinancement — requis pour les dossiers > 5k€.",
        "Self-financing capacity and co-financing share — required for grant requests > €5k.",
      ),
      who_provides: "accountant",
    });
  }

  items.push({
    doc: pickLang(lang, "RIB de l'entreprise", "Company bank details (RIB / IBAN)"),
    why: pickLang(
      lang,
      "Identification du compte qui recevra l'éventuel versement.",
      "Identifies the account that would receive any disbursement.",
    ),
    who_provides: "hotelier",
  });

  items.push({
    doc: pickLang(lang, "Devis vendor signés ou pré-signés", "Signed or pre-signed vendor quotes"),
    why: pickLang(
      lang,
      "Justifie le montant demandé. Rinzler peut aider à demander les devis aux vendors retenus.",
      "Justifies the requested amount. Rinzler can help solicit quotes from selected vendors.",
    ),
    who_provides: "rinzler",
  });

  items.push({
    doc: pickLang(lang, "Note de cadrage du projet (ce document)", "Project framing note (this document)"),
    why: pickLang(
      lang,
      "Le présent brief, à joindre tel quel ou à adapter à la grille du programme visé.",
      "This brief, attached as-is or adapted to the target programme's template.",
    ),
    who_provides: "rinzler",
  });

  return items;
}

function buildMissingInputs(args: BriefGeneratorInput): MissingInput[] {
  const a = args.additionalInputs ?? {};
  const lang = args.language;
  const items: MissingInput[] = [];

  if (!a.legal_name) {
    items.push({
      field: "legal_name",
      label: pickLang(lang, "Raison sociale exacte de l'entreprise", "Exact legal name of the company"),
      required: true,
    });
  }
  if (!a.siret && (args.hotel.country ?? "").toUpperCase() === "FR") {
    items.push({
      field: "siret",
      label: pickLang(lang, "Numéro SIRET (14 chiffres)", "SIRET number (14 digits)"),
      required: true,
    });
  }
  if (a.annual_revenue_kEUR === undefined) {
    items.push({
      field: "annual_revenue_kEUR",
      label: pickLang(lang, "Chiffre d'affaires annuel (en k€)", "Annual revenue (k€)"),
      required: false,
    });
  }
  if (a.total_budget_kEUR === undefined) {
    items.push({
      field: "total_budget_kEUR",
      label: pickLang(lang, "Budget total envisagé pour le projet (en k€)", "Total project budget (k€)"),
      required: false,
    });
  }
  if (!a.project_lead_name) {
    items.push({
      field: "project_lead_name",
      label: pickLang(lang, "Nom du chef de projet côté hôtel", "Project lead name (hotelier side)"),
      required: false,
    });
  }
  if (!a.project_lead_phone) {
    items.push({
      field: "project_lead_phone",
      label: pickLang(lang, "Téléphone du chef de projet", "Project lead phone"),
      required: false,
    });
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

export function generateBrief(args: BriefGeneratorInput): FundingBriefContent {
  const disclaimer =
    args.language === "fr" ? FUNDING_DISCLAIMER_FR : FUNDING_DISCLAIMER_EN;

  return {
    schema_version: "funding-brief.v1",
    generated_at: new Date().toISOString(),
    language: args.language,
    company_info: buildCompanyInfo(args),
    project_description: buildProjectDescription(args),
    digital_transformation_goals: buildDigitalGoals(args),
    ai_data_objectives: buildAiDataObjectives(args),
    expected_benefits: buildExpectedBenefits(args),
    implementation_roadmap: buildRoadmap(args),
    budget_estimate: buildBudget(args),
    supporting_documents_checklist: buildDocumentChecklist(args),
    missing_inputs: buildMissingInputs(args),
    eligibility_disclaimer: disclaimer,
  };
}
