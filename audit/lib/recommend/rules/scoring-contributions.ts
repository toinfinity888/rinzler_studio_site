/**
 * T068 — Scoring contributions per dimension (FR-036 / FR-037).
 *
 * Each `score*` function returns one readiness score:
 *   { value: 0..100, band: low/medium/high, basis: string[] }
 *
 * `basis` enumerates the answer / scan_finding ids that drove the value so
 * the score is auditable end-to-end (FR-037 + SC-010 traceability).
 *
 * The dispatcher in `../score-calculator.ts` invokes every function.
 */
import type {
  Band,
  ReadinessScoreResult,
  RecommendationContext,
} from "../types";

/* ----------------------------- helpers ----------------------------- */

function band(value: number): Band {
  if (value < 40) return "low";
  if (value < 70) return "medium";
  return "high";
}

function clamp(value: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(value)));
}

function answer<T = unknown>(ctx: RecommendationContext, slug: string): T | undefined {
  return ctx.answersByslug[slug] as T | undefined;
}

function scan<T = unknown>(ctx: RecommendationContext, field: string): T | undefined {
  return ctx.scanByField[field] as T | undefined;
}

function isYes(v: unknown): boolean {
  return v === true || v === "yes";
}

function isNo(v: unknown): boolean {
  return v === false || v === "no";
}

/* ----------------------------- per-dimension rules ----------------------------- */

export function scoreWebsite(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 50;
  const basis: string[] = [];
  const perfMobile = scan<number>(ctx, "lighthouse_performance_mobile");
  if (typeof perfMobile === "number") {
    v += (perfMobile - 50) / 2; // each 10 lighthouse points = +5
    basis.push("scan:lighthouse_performance_mobile");
  }
  const lcp = scan<number>(ctx, "lcp_ms");
  if (typeof lcp === "number") {
    if (lcp <= 2500) v += 10;
    else if (lcp >= 4000) v -= 10;
    basis.push("scan:lcp_ms");
  }
  const httpsOk = scan<boolean>(ctx, "https_enabled");
  if (httpsOk === false) {
    v -= 20;
    basis.push("scan:https_enabled");
  }
  return { dimension: "website", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreAiSearch(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 40;
  const basis: string[] = [];
  if (scan<boolean>(ctx, "schema_hotel_present") === true) {
    v += 25;
    basis.push("scan:schema_hotel_present");
  } else if (scan<boolean>(ctx, "schema_hotel_present") === false) {
    v -= 10;
    basis.push("scan:schema_hotel_present");
  }
  if (scan<boolean>(ctx, "faq_present") === true) {
    v += 15;
    basis.push("scan:faq_present");
  }
  if (scan<boolean>(ctx, "og_tags_present") === true) {
    v += 10;
    basis.push("scan:og_tags_present");
  }
  return { dimension: "ai_search", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreDirectBooking(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 40;
  const basis: string[] = [];
  const target = scan<string>(ctx, "booking_button_target");
  if (target === "internal") {
    v += 25;
    basis.push("scan:booking_button_target");
  } else if (target === "external") {
    v -= 10;
    basis.push("scan:booking_button_target");
  }
  const perfMobile = scan<number>(ctx, "lighthouse_performance_mobile");
  if (typeof perfMobile === "number" && perfMobile >= 70) {
    v += 10;
    basis.push("scan:lighthouse_performance_mobile");
  }
  if (isYes(answer(ctx, "has_dedicated_booking_engine"))) {
    v += 15;
    basis.push("answer:has_dedicated_booking_engine");
  }
  return { dimension: "direct_booking", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreGuestCommunication(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 40;
  const basis: string[] = [];
  if (isYes(answer(ctx, "uses_whatsapp")) || scan<boolean>(ctx, "whatsapp_visible") === true) {
    v += 15;
    basis.push("answer:uses_whatsapp", "scan:whatsapp_visible");
  }
  if (isYes(answer(ctx, "has_response_templates"))) {
    v += 15;
    basis.push("answer:has_response_templates");
  }
  if (isNo(answer(ctx, "captures_guest_emails"))) {
    v -= 10;
    basis.push("answer:captures_guest_emails");
  }
  if (typeof answer(ctx, "response_time_sla_hours") === "number") {
    const sla = answer<number>(ctx, "response_time_sla_hours")!;
    if (sla <= 4) v += 10;
    else if (sla > 24) v -= 10;
    basis.push("answer:response_time_sla_hours");
  }
  return { dimension: "guest_communication", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreAutomation(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 35;
  const basis: string[] = [];
  const comfort = answer<number>(ctx, "staff_tool_comfort");
  if (typeof comfort === "number") {
    v += (comfort - 3) * 8;
    basis.push("answer:staff_tool_comfort");
  }
  if (isYes(answer(ctx, "has_knowledge_base"))) {
    v += 15;
    basis.push("answer:has_knowledge_base");
  }
  if (isYes(answer(ctx, "uses_automated_emails"))) {
    v += 10;
    basis.push("answer:uses_automated_emails");
  }
  return { dimension: "automation", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreToolStackCoherence(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 50;
  const basis: string[] = [];
  const pms = answer<string>(ctx, "pms_vendor");
  const channels = answer<unknown[]>(ctx, "distribution_channels");
  if (pms && pms !== "none" && pms !== "other") {
    v += 10;
    basis.push("answer:pms_vendor");
  }
  if (Array.isArray(channels) && channels.length >= 3) {
    v += 5;
    basis.push("answer:distribution_channels");
  }
  if (isYes(answer(ctx, "pms_integrates_with_booking_engine"))) {
    v += 15;
    basis.push("answer:pms_integrates_with_booking_engine");
  }
  if (isNo(answer(ctx, "pms_integrates_with_booking_engine"))) {
    v -= 10;
  }
  return { dimension: "tool_stack_coherence", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreDataIntegration(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 45;
  const basis: string[] = [];
  if (isYes(answer(ctx, "has_central_data_view"))) {
    v += 20;
    basis.push("answer:has_central_data_view");
  }
  if (isYes(answer(ctx, "tracks_occupancy"))) {
    v += 10;
    basis.push("answer:tracks_occupancy");
  }
  if (isYes(answer(ctx, "captures_guest_emails"))) {
    v += 10;
    basis.push("answer:captures_guest_emails");
  }
  return { dimension: "data_integration", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreCompliance(ctx: RecommendationContext): ReadinessScoreResult {
  let v = 50;
  const basis: string[] = [];
  if (isYes(answer(ctx, "has_privacy_policy"))) {
    v += 15;
    basis.push("answer:has_privacy_policy");
  }
  if (isYes(answer(ctx, "has_dpa_process"))) {
    v += 15;
    basis.push("answer:has_dpa_process");
  } else if (isNo(answer(ctx, "has_dpa_process"))) {
    v -= 15;
    basis.push("answer:has_dpa_process");
  }
  if (isYes(answer(ctx, "uses_ai_in_guest_replies")) && isNo(answer(ctx, "ai_transparency_notice"))) {
    v -= 20;
    basis.push("answer:uses_ai_in_guest_replies", "answer:ai_transparency_notice");
  }
  return { dimension: "compliance", value: clamp(v), band: band(clamp(v)), basis };
}

export function scoreOperationalWorkload(ctx: RecommendationContext): ReadinessScoreResult {
  // High score = LOW workload pressure (we want consistency: higher is better).
  let v = 50;
  const basis: string[] = [];
  const pressure = answer<number>(ctx, "operational_workload_pressure");
  if (typeof pressure === "number") {
    // pressure 1 (low) -> 80; pressure 5 (very high) -> 20
    v = clamp(100 - pressure * 16);
    basis.push("answer:operational_workload_pressure");
  }
  if (isYes(answer(ctx, "has_response_templates"))) {
    v += 5;
    basis.push("answer:has_response_templates");
  }
  if (isNo(answer(ctx, "has_knowledge_base"))) {
    v -= 10;
    basis.push("answer:has_knowledge_base");
  }
  return { dimension: "operational_workload", value: clamp(v), band: band(clamp(v)), basis };
}
