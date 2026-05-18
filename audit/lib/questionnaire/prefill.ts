/**
 * T052 — Pre-fill from scan findings (FR-016).
 *
 * Given a project + its scan-findings + the next block's hydrated questions,
 * decide which question slugs can be pre-filled from data we already have,
 * and emit the attribution list the renderer surfaces ("ce champ a été
 * pré-rempli à partir du scan").
 *
 * The pre-fill rules are intentionally conservative: we only pre-fill where
 * the mapping is unambiguous (the scan detected a specific vendor for which
 * the question has a matching option, or the question's slug names a scan
 * field directly). Anything more aggressive runs into hallucination risk.
 *
 * Returns a list of (slug, value, source) tuples. The caller persists the
 * pre-fills as `answers` rows with `source = 'scan_inferred'` and lowers
 * confidence accordingly.
 */

import type { RenderableQuestion } from "./types";

export interface PrefillInput {
  /** Map of scan finding field → value_json (jsonb passthrough). */
  scanFindings: Record<string, unknown>;
  /** Already-committed answers, keyed by slug. Used to avoid clobbering. */
  existingAnswers: Record<string, unknown>;
  /**
   * Optional consultant pre-fills supplied at project setup
   * (FR-016, FR-072). Keyed by slug.
   */
  consultantPrefill?: Record<string, unknown>;
}

export interface PrefillEntry {
  question_slug: string;
  value: unknown;
  source: "scan" | "consultant";
}

/**
 * Direct mapping table: question slug → scan finding field.
 *
 * Encoded here (not in the question_versions definition) because the scan
 * field catalogue is itself a static contract owned by the scanner, not by
 * the questionnaire admin. The questionnaire admin only chooses whether to
 * mark a question "prefill candidate" via the slug naming convention.
 *
 * Extending this map is a code change — that is intentional. Scan-derived
 * pre-fills must remain auditable.
 */
const SLUG_TO_SCAN_FIELD: Record<string, string> = {
  pms_vendor: "vendor_pms",
  booking_engine_vendor: "vendor_booking_engine",
  channel_manager_vendor: "vendor_channel_manager",
  whatsapp_visible: "whatsapp_visible",
  has_hotel_schema: "schema_hotel_present",
  booking_button_target: "booking_button_target",
};

/**
 * Decide pre-fills for a single block.
 *
 * Pre-fill precedence (highest → lowest):
 *   1. existingAnswers — never overwrite (FR-016 phrasing: "indicate which
 *      fields were pre-filled and allow the hotelier to correct them"; once
 *      the hotelier has answered, the answer is theirs).
 *   2. consultantPrefill — applied before scan-derived pre-fill.
 *   3. SLUG_TO_SCAN_FIELD lookup against scanFindings.
 */
export function computePrefills(
  questions: RenderableQuestion[],
  input: PrefillInput,
): PrefillEntry[] {
  const out: PrefillEntry[] = [];

  for (const q of questions) {
    if (Object.prototype.hasOwnProperty.call(input.existingAnswers, q.slug)) {
      continue; // hotelier (or someone) already committed an answer; preserve.
    }
    const consultantVal = input.consultantPrefill?.[q.slug];
    if (consultantVal !== undefined && consultantVal !== null) {
      out.push({ question_slug: q.slug, value: consultantVal, source: "consultant" });
      continue;
    }
    const scanField = SLUG_TO_SCAN_FIELD[q.slug];
    if (!scanField) continue;
    const scanVal = input.scanFindings[scanField];
    if (scanVal === undefined || scanVal === null) continue;
    // For choice-typed questions, the scan value must be a known option.
    if (
      (q.answer_type === "single" ||
        q.answer_type === "dropdown" ||
        q.answer_type === "multi") &&
      q.options.length > 0
    ) {
      const slugs = q.options.map((o) => o.slug);
      if (q.answer_type === "multi") {
        if (Array.isArray(scanVal)) {
          const filtered = scanVal.filter(
            (v) => typeof v === "string" && slugs.includes(v),
          );
          if (filtered.length === 0) continue;
          out.push({ question_slug: q.slug, value: filtered, source: "scan" });
          continue;
        }
        continue;
      }
      if (typeof scanVal === "string" && slugs.includes(scanVal)) {
        out.push({ question_slug: q.slug, value: scanVal, source: "scan" });
      }
      continue;
    }
    // For yes_no_unknown questions, coerce truthy/falsy into yes/no.
    if (q.answer_type === "yes_no_unknown") {
      if (typeof scanVal === "boolean") {
        out.push({
          question_slug: q.slug,
          value: scanVal ? "yes" : "no",
          source: "scan",
        });
      } else if (
        typeof scanVal === "string" &&
        (scanVal === "yes" || scanVal === "no" || scanVal === "unknown")
      ) {
        out.push({ question_slug: q.slug, value: scanVal, source: "scan" });
      }
      continue;
    }
    // For other types (slider, short_text), pass through if the value is a
    // primitive of the right type.
    if (q.answer_type === "short_text" && typeof scanVal === "string") {
      out.push({ question_slug: q.slug, value: scanVal, source: "scan" });
    }
    if (q.answer_type === "slider" && typeof scanVal === "number") {
      out.push({ question_slug: q.slug, value: scanVal, source: "scan" });
    }
  }

  return out;
}
