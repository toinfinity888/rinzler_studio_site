/**
 * T068 — Eligibility rules.
 *
 * Pure functions that filter the vendor catalogue down to entries that match
 * the hotel's profile, language, GDPR posture, and current-stack constraints.
 *
 * Each per-category function returns a list of eligible vendors with the
 * rule's reasons + signals_consulted (FR-113). The dispatcher
 * `findEligibleVendors` runs every per-category rule and merges results.
 *
 * The rules deliberately stay loose: we do NOT want to throw away an
 * otherwise-good vendor because of a single missing language field — the
 * engine downstream lowers confidence for those cases instead. The
 * `unknown` enum value behaves as "not disqualifying" everywhere.
 */
import type {
  EligibleVendor,
  RecommendationContext,
  VendorCatalogueEntry,
  SignalsConsulted,
} from "../types";

const SMALL_HOTEL_THRESHOLD = 60;
const FRENCH_LANG = "fr";
const FRENCH_COUNTRY = "FR";

/* ----------------------------- helpers ----------------------------- */

function hotelSize(ctx: RecommendationContext): "small" | "medium" | "large" {
  const rooms = ctx.hotel.room_count ?? 0;
  if (rooms <= 0) return "small";
  if (rooms <= SMALL_HOTEL_THRESHOLD) return "small";
  if (rooms <= 150) return "medium";
  return "large";
}

function isIndependentHotel(ctx: RecommendationContext): boolean {
  return (
    ctx.hotel.property_type === "independent" ||
    ctx.hotel.property_type === "boutique" ||
    ctx.hotel.property_type === "family" ||
    ctx.hotel.property_type === "guesthouse"
  );
}

function preferredLanguage(ctx: RecommendationContext): string {
  return ctx.hotel.primary_language || FRENCH_LANG;
}

function checkLanguageSupport(vendor: VendorCatalogueEntry, lang: string): boolean {
  if (!vendor.languagesSupported || vendor.languagesSupported.length === 0) return true; // unknown ≠ disqualifying
  return vendor.languagesSupported.includes(lang);
}

function checkHotelSize(vendor: VendorCatalogueEntry, size: string): boolean {
  if (!vendor.targetHotelSizes || vendor.targetHotelSizes.length === 0) return true;
  return vendor.targetHotelSizes.includes(size);
}

function checkPropertyType(vendor: VendorCatalogueEntry, ctx: RecommendationContext): boolean {
  if (!vendor.targetPropertyTypes || vendor.targetPropertyTypes.length === 0) return true;
  return ctx.hotel.property_type ? vendor.targetPropertyTypes.includes(ctx.hotel.property_type) : true;
}

function checkCountry(vendor: VendorCatalogueEntry, country: string | null): boolean {
  if (!vendor.countriesServed || vendor.countriesServed.length === 0) return true;
  if (!country) return true;
  return vendor.countriesServed.includes(country);
}

function checkGdpr(vendor: VendorCatalogueEntry): { ok: boolean; conf: "high" | "medium" | "low" } {
  // We do NOT exclude `unknown` postures (FR-053 says lower confidence instead).
  if (vendor.gdprPosture === "non_compliant") return { ok: false, conf: "low" };
  if (vendor.gdprPosture === "dpa_published") return { ok: true, conf: "high" };
  if (vendor.gdprPosture === "dpa_on_request") return { ok: true, conf: "medium" };
  return { ok: true, conf: "low" };
}

function checkEuHosting(vendor: VendorCatalogueEntry, country: string | null): boolean {
  if (!country) return true;
  if (country !== FRENCH_COUNTRY && !country.startsWith("EU")) return true;
  if (vendor.euHosting === "non_eu") return false; // EU hotel + non-EU hosting = exclude
  return true;
}

function rateSuitability(vendor: VendorCatalogueEntry, ctx: RecommendationContext): boolean {
  if (isIndependentHotel(ctx) && vendor.independentHotelSuitability === "weak") return false;
  if (hotelSize(ctx) === "small" && vendor.smallHotelSuitability === "weak") return false;
  return true;
}

function vendorReasons(vendor: VendorCatalogueEntry, ctx: RecommendationContext): string[] {
  const r: string[] = [];
  if (checkCountry(vendor, ctx.hotel.country)) {
    if (vendor.countriesServed?.length) r.push(`countries_served includes ${ctx.hotel.country}`);
  }
  if (checkLanguageSupport(vendor, preferredLanguage(ctx))) {
    if (vendor.languagesSupported?.length) r.push(`languages_supported includes ${preferredLanguage(ctx)}`);
  }
  if (checkHotelSize(vendor, hotelSize(ctx))) {
    if (vendor.targetHotelSizes?.length) r.push(`targets ${hotelSize(ctx)} hotels`);
  }
  if (vendor.frenchMarketRelevance === "native_fr" && ctx.hotel.country === FRENCH_COUNTRY) {
    r.push("native French-market vendor");
  }
  if (vendor.smallHotelSuitability === "strong" && hotelSize(ctx) === "small") {
    r.push("strong fit for small hotels");
  }
  return r;
}

function defaultSignals(ctx: RecommendationContext): SignalsConsulted {
  const sig: SignalsConsulted = {
    answers: [],
    scan_findings: [],
    vendor_fields: [
      "targetHotelSizes",
      "languagesSupported",
      "countriesServed",
      "gdprPosture",
      "euHosting",
    ],
  };
  if (ctx.hotel.country) sig.answers.push("hotel_country");
  if (ctx.hotel.property_type) sig.answers.push("hotel_property_type");
  if (ctx.hotel.room_count != null) sig.answers.push("hotel_room_count");
  return sig;
}

function buildEligible(
  vendor: VendorCatalogueEntry,
  ctx: RecommendationContext,
): EligibleVendor | null {
  const size = hotelSize(ctx);
  if (!checkHotelSize(vendor, size)) return null;
  if (!checkPropertyType(vendor, ctx)) return null;
  if (!checkLanguageSupport(vendor, preferredLanguage(ctx))) return null;
  if (!checkCountry(vendor, ctx.hotel.country)) return null;
  if (!checkEuHosting(vendor, ctx.hotel.country)) return null;
  if (!rateSuitability(vendor, ctx)) return null;
  const gdpr = checkGdpr(vendor);
  if (!gdpr.ok) return null;
  return {
    vendor,
    reasons: vendorReasons(vendor, ctx),
    signals: defaultSignals(ctx),
  };
}

/* ----------------------------- per-category rules ----------------------------- */

export function eligibleGuestMessaging(ctx: RecommendationContext): EligibleVendor[] {
  return ctx.vendorCatalogue
    .filter((v) => v.category === "guest_messaging" || v.category === "ai_concierge")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

export function eligibleBookingEngines(ctx: RecommendationContext): EligibleVendor[] {
  return ctx.vendorCatalogue
    .filter((v) => v.category === "booking_engine")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

export function eligibleChannelManagers(ctx: RecommendationContext): EligibleVendor[] {
  return ctx.vendorCatalogue
    .filter((v) => v.category === "channel_manager")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

export function eligibleCrms(ctx: RecommendationContext): EligibleVendor[] {
  return ctx.vendorCatalogue
    .filter((v) => v.category === "crm")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

export function eligiblePms(ctx: RecommendationContext): EligibleVendor[] {
  // Only suggest a PMS migration when the current PMS is "other", "none" or
  // the audit goal is "pms_evaluation". This is the stack-current-vendor
  // exclusion the rules dispatcher applies.
  const currentPms = ctx.answersByslug["pms_vendor"];
  const goal = ctx.project.goal_primary;
  const allow =
    goal === "pms_evaluation" || currentPms === "none" || currentPms === "other" || !currentPms;
  if (!allow) return [];
  return ctx.vendorCatalogue
    .filter((v) => v.category === "pms")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

export function eligibleReviewManagement(ctx: RecommendationContext): EligibleVendor[] {
  return ctx.vendorCatalogue
    .filter((v) => v.category === "review_management")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

export function eligibleWebsite(ctx: RecommendationContext): EligibleVendor[] {
  return ctx.vendorCatalogue
    .filter((v) => v.category === "website")
    .map((v) => buildEligible(v, ctx))
    .filter((x): x is EligibleVendor => x !== null);
}

/* ----------------------------- dispatcher ----------------------------- */

export interface EligibilityResult {
  category: string;
  vendors: EligibleVendor[];
}

export function findEligibleVendors(ctx: RecommendationContext): EligibilityResult[] {
  return [
    { category: "guest_messaging", vendors: eligibleGuestMessaging(ctx) },
    { category: "booking_engine", vendors: eligibleBookingEngines(ctx) },
    { category: "channel_manager", vendors: eligibleChannelManagers(ctx) },
    { category: "crm", vendors: eligibleCrms(ctx) },
    { category: "pms", vendors: eligiblePms(ctx) },
    { category: "review_management", vendors: eligibleReviewManagement(ctx) },
    { category: "website", vendors: eligibleWebsite(ctx) },
  ];
}

/** Helper: flatten the eligibility result into a single list. */
export function flattenEligible(results: EligibilityResult[]): EligibleVendor[] {
  return results.flatMap((r) => r.vendors);
}
