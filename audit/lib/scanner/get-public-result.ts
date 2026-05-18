import "server-only";

/**
 * `getPublicScanResult(scanId)` — public server action (T043).
 *
 * Loads the scan + its findings, transforms raw rows into the plain-language
 * `Observation[]`, `QuickWin[]`, and `DetectedVendor[]` shape consumed by the
 * `(public)/scan/[scanId]/page.tsx` view.
 *
 * No authentication. The scanId is the caller's bearer.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { scans, scanFindings, type ScanFinding } from "@/db/schema";

export type ObservationCategory =
  | "performance"
  | "mobile"
  | "ai_search"
  | "booking_path"
  | "communication"
  | "tech_stack";

export type ObservationSeverity = "info" | "opportunity" | "risk";

export interface Observation {
  category: ObservationCategory;
  headline: string;
  detail: string;
  severity: ObservationSeverity;
  evidence_hint?: string;
}

export interface QuickWin {
  title: string;
  why_it_matters: string;
  estimated_effort: "low" | "medium" | "high";
}

export interface DetectedVendor {
  category: string;
  slug: string;
  display_name: string;
  matched_on: string;
}

export interface UpgradeCta {
  estimated_minutes: number;
  next_tier: "mini" | "full";
  differences_from_free: string[];
}

export interface PublicScanResult {
  scanId: string;
  projectId: string;
  url: string;
  status: "queued" | "running" | "succeeded" | "failed" | "blocked";
  errorClass: string | null;
  observations: Observation[];
  opportunity_map: QuickWin[];
  detected_vendors: DetectedVendor[];
  freshness_expires_at: string | null;
  upgrade_cta: UpgradeCta;
}

export async function getPublicScanResult(
  scanId: string,
): Promise<PublicScanResult | null> {
  const rows = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (rows.length === 0) return null;
  const scan = rows[0]!;

  const findings = await db
    .select()
    .from(scanFindings)
    .where(eq(scanFindings.scanId, scanId));
  const byField = indexByField(findings);

  const observations: Observation[] = [];
  pushPerformanceObservations(byField, observations);
  pushMobileObservations(byField, observations);
  pushAiSearchObservations(byField, observations);
  pushBookingPathObservations(byField, observations);
  pushCommunicationObservations(byField, observations);
  pushTechStackObservations(byField, observations);
  pushGuardianObservations(byField, observations, scan.errorClass);

  return {
    scanId: scan.id,
    projectId: scan.projectId ?? scan.id,
    url: scan.url,
    status: scan.status,
    errorClass: scan.errorClass ?? null,
    observations,
    opportunity_map: deriveQuickWins(observations),
    detected_vendors: extractDetectedVendors(findings),
    freshness_expires_at: scan.freshnessExpiresAt?.toISOString() ?? null,
    upgrade_cta: {
      estimated_minutes: 20,
      next_tier: "mini",
      differences_from_free: [
        "Diagnostic complet avec questionnaire personnalisé",
        "Scénarios chiffrés et recommandations expliquées",
        "Feuille de route 30/60/90 jours",
        "Section conformité (RGPD, IA, hébergement)",
      ],
    },
  };
}

/* ------------------------- helpers ------------------------- */

function indexByField(findings: ScanFinding[]): Map<string, ScanFinding> {
  const m = new Map<string, ScanFinding>();
  for (const f of findings) m.set(f.field, f);
  return m;
}

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

function pushPerformanceObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
) {
  const perf = num(by.get("lighthouse_desktop_performance")?.valueJson);
  const lcp = num(by.get("lighthouse_desktop_lcp_ms")?.valueJson);
  if (perf != null) {
    const score = Math.round(perf * 100);
    if (score < 50) {
      out.push({
        category: "performance",
        headline: "Performance technique du site faible",
        detail: `Lighthouse mesure un score Performance de ${score}/100 sur la version desktop. Une page lente pénalise les conversions et le référencement.`,
        severity: "risk",
        evidence_hint: lcp ? `LCP desktop ≈ ${Math.round(lcp)} ms` : undefined,
      });
    } else if (score < 80) {
      out.push({
        category: "performance",
        headline: "Marges d'amélioration sur la performance",
        detail: `Lighthouse mesure un score Performance de ${score}/100. Au-dessus de 80, on considère la page rapide pour la majorité des visiteurs.`,
        severity: "opportunity",
        evidence_hint: lcp ? `LCP desktop ≈ ${Math.round(lcp)} ms` : undefined,
      });
    } else {
      out.push({
        category: "performance",
        headline: "Performance technique correcte",
        detail: `Lighthouse mesure un score Performance de ${score}/100 sur la version desktop.`,
        severity: "info",
      });
    }
  }
}

function pushMobileObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
) {
  const mPerf = num(by.get("lighthouse_mobile_performance")?.valueJson);
  const mLcp = num(by.get("lighthouse_mobile_lcp_ms")?.valueJson);
  if (mPerf != null) {
    const score = Math.round(mPerf * 100);
    if (score < 50) {
      out.push({
        category: "mobile",
        headline: "Expérience mobile lente",
        detail: `Sur smartphone simulé, Lighthouse mesure un score Performance de ${score}/100. La majorité des visiteurs d'hôtel arrivent en mobile.`,
        severity: "risk",
        evidence_hint: mLcp ? `LCP mobile ≈ ${Math.round(mLcp)} ms` : undefined,
      });
    } else if (mLcp != null && mLcp > 2500) {
      out.push({
        category: "mobile",
        headline: "Largest Contentful Paint mobile au-dessus du seuil recommandé",
        detail: `Le plus gros élément de contenu apparaît en environ ${Math.round(mLcp)} ms sur mobile (recommandation Google : < 2 500 ms).`,
        severity: "opportunity",
      });
    } else {
      out.push({
        category: "mobile",
        headline: "Expérience mobile correcte",
        detail: `Score Performance mobile : ${score}/100.`,
        severity: "info",
      });
    }
  }
}

function pushAiSearchObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
) {
  const hotelSchema = bool(by.get("schema_hotel_present")?.valueJson);
  const faq = bool(by.get("faq_present")?.valueJson);
  if (!hotelSchema) {
    out.push({
      category: "ai_search",
      headline: "Pas de schéma Hôtel détecté",
      detail:
        "Sans balisage schema.org Hotel/LodgingBusiness, votre site est moins compréhensible par les moteurs de recherche et les nouveaux moteurs IA (Google AI Overview, Perplexity, ChatGPT Search).",
      severity: "opportunity",
      evidence_hint: "Vérification JSON-LD",
    });
  } else {
    out.push({
      category: "ai_search",
      headline: "Schéma Hôtel détecté",
      detail:
        "Votre site déclare explicitement être un hôtel via schema.org. Les moteurs IA peuvent l'utiliser pour vous citer plus précisément.",
      severity: "info",
    });
  }
  if (!faq) {
    out.push({
      category: "ai_search",
      headline: "Aucune section FAQ identifiable",
      detail:
        "Une page FAQ structurée permet aux moteurs IA de répondre à vos prospects en citant votre site plutôt qu'un agrégateur.",
      severity: "opportunity",
    });
  }
}

function pushBookingPathObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
) {
  const target = by.get("booking_button_target")?.valueJson;
  const external = bool(by.get("booking_button_external")?.valueJson);
  if (target && external) {
    out.push({
      category: "booking_path",
      headline: "Bouton de réservation redirige vers un domaine externe",
      detail:
        "Quand le visiteur clique sur « Réserver », il quitte votre site pour le moteur du prestataire. Vous perdez la mesure analytique et l'opportunité de personnaliser le tunnel.",
      severity: "risk",
      evidence_hint: typeof target === "string" ? target : undefined,
    });
  } else if (target) {
    out.push({
      category: "booking_path",
      headline: "Bouton de réservation détecté",
      detail: "Le tunnel de réservation reste sur votre domaine principal.",
      severity: "info",
    });
  } else {
    out.push({
      category: "booking_path",
      headline: "Aucun bouton de réservation évident",
      detail:
        "Le scan n'a pas trouvé de bouton clairement libellé « Réserver » sur la page d'accueil. Cela peut diluer l'intention de l'utilisateur.",
      severity: "opportunity",
    });
  }
}

function pushCommunicationObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
) {
  const wa = bool(by.get("whatsapp_visible")?.valueJson);
  const phone = bool(by.get("phone_visible")?.valueJson);
  if (!wa) {
    out.push({
      category: "communication",
      headline: "WhatsApp n'apparaît pas comme canal direct",
      detail:
        "WhatsApp est aujourd'hui le canal préféré de nombreux prospects internationaux. Un lien wa.me visible peut réduire la friction préréservation.",
      severity: "opportunity",
    });
  }
  if (!phone) {
    out.push({
      category: "communication",
      headline: "Aucun lien téléphonique direct",
      detail:
        "Un lien tel: cliquable depuis mobile augmente les contacts entrants chauds.",
      severity: "opportunity",
    });
  }
  if (wa && phone) {
    out.push({
      category: "communication",
      headline: "Canaux directs visibles",
      detail: "WhatsApp et téléphone sont accessibles depuis votre page.",
      severity: "info",
    });
  }
}

function pushTechStackObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
) {
  for (const category of ["booking_engine", "pms", "channel_manager", "crm", "guest_messaging"]) {
    const f = by.get(`vendor_${category}`);
    if (!f) continue;
    const matches = Array.isArray(f.valueJson) ? (f.valueJson as Array<{ display_name?: string }>) : [];
    if (matches.length === 0) continue;
    out.push({
      category: "tech_stack",
      headline: `Outil détecté : ${matches[0]?.display_name ?? matches[0]?.["display_name"] ?? category}`,
      detail: `Catégorie « ${humanCategory(category)} ». Détecté automatiquement depuis le code de la page.`,
      severity: "info",
      evidence_hint: matches.map((m) => m.display_name).filter(Boolean).join(", "),
    });
  }
}

function pushGuardianObservations(
  by: Map<string, ScanFinding>,
  out: Observation[],
  errorClass: string | null,
) {
  if (errorClass === "non_hotel" || by.has("guidance_non_hotel")) {
    out.push({
      category: "tech_stack",
      headline: "Le site ne semble pas être un hôtel",
      detail:
        "Aucun signal hôtelier (schéma, bouton de réservation, mots-clés) n'a été détecté. Vérifiez que l'URL pointe bien sur la page d'accueil de l'hôtel.",
      severity: "info",
    });
  }
  if (errorClass === "captcha_blocked" || by.has("guidance_captcha_blocked")) {
    out.push({
      category: "tech_stack",
      headline: "Page protégée par un CAPTCHA",
      detail:
        "Le scan a été bloqué par une protection anti-bot (Cloudflare ou équivalent). Demandez un scan manuel pour analyser le site.",
      severity: "info",
    });
  }
  if (errorClass === "login_wall" || by.has("guidance_login_wall")) {
    out.push({
      category: "tech_stack",
      headline: "Page protégée par mot de passe",
      detail:
        "Le scan rencontre un mur d'authentification. Seules les pages accessibles publiquement peuvent être diagnostiquées.",
      severity: "info",
    });
  }
}

function deriveQuickWins(observations: Observation[]): QuickWin[] {
  const wins: QuickWin[] = [];
  for (const o of observations) {
    if (o.severity !== "opportunity" && o.severity !== "risk") continue;
    if (o.category === "ai_search" && /schéma/i.test(o.headline)) {
      wins.push({
        title: "Ajouter le balisage schema.org Hotel",
        why_it_matters:
          "Aide les moteurs IA et Google à comprendre votre établissement et augmente vos chances d'être cité directement.",
        estimated_effort: "low",
      });
    }
    if (o.category === "booking_path" && /externe/i.test(o.headline)) {
      wins.push({
        title: "Réintégrer le tunnel de réservation sur votre domaine",
        why_it_matters:
          "Vous conservez les visiteurs, mesurez le taux de conversion réel et pouvez personnaliser l'expérience.",
        estimated_effort: "medium",
      });
    }
    if (o.category === "mobile") {
      wins.push({
        title: "Optimiser la performance mobile",
        why_it_matters:
          "La majorité des visiteurs hôteliers arrivent en mobile. Chaque seconde gagnée se traduit par des conversions supplémentaires.",
        estimated_effort: "medium",
      });
    }
    if (o.category === "communication" && /WhatsApp/i.test(o.headline)) {
      wins.push({
        title: "Ajouter un bouton WhatsApp visible",
        why_it_matters:
          "Réduit la friction préréservation pour les voyageurs internationaux qui préfèrent ce canal.",
        estimated_effort: "low",
      });
    }
  }
  // De-dup by title.
  const seen = new Set<string>();
  return wins.filter((w) => {
    if (seen.has(w.title)) return false;
    seen.add(w.title);
    return true;
  });
}

function extractDetectedVendors(findings: ScanFinding[]): DetectedVendor[] {
  const out: DetectedVendor[] = [];
  for (const f of findings) {
    if (!f.field.startsWith("vendor_")) continue;
    const category = f.field.slice("vendor_".length);
    const matches = Array.isArray(f.valueJson)
      ? (f.valueJson as Array<{ slug?: string; display_name?: string; matched_on?: string }>)
      : [];
    for (const m of matches) {
      if (m.slug && m.display_name) {
        out.push({
          category,
          slug: m.slug,
          display_name: m.display_name,
          matched_on: m.matched_on ?? "unknown",
        });
      }
    }
  }
  return out;
}

function humanCategory(c: string): string {
  switch (c) {
    case "booking_engine":
      return "Moteur de réservation";
    case "pms":
      return "PMS";
    case "channel_manager":
      return "Channel manager";
    case "crm":
      return "CRM";
    case "guest_messaging":
      return "Messagerie client";
    default:
      return c;
  }
}
