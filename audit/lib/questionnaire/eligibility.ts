/**
 * Pure eligibility + translation helpers extracted from `load-block.ts`
 * so the FR-103 / FR-104 / SC-014 contracts can be tested in isolation
 * (the loader itself is `server-only` and runs a real DB query).
 *
 * Keep these in sync with `load-block.ts` — the loader imports them so
 * there is exactly one branch of decision logic.
 */

export const CANONICAL_LANGUAGE = "fr";

export interface EligibilityCandidate {
  /** Maps to `questions.status` in the DB. */
  status: string;
  /** Maps to `questions.audit_levels`. */
  auditLevels: string[];
  /** Maps to `questions.hotel_types` (null/empty = any). */
  hotelTypes: string[] | null;
}

export interface EligibilityArgs {
  tier: string;
  hotelType: string | null;
}

/**
 * The single-source predicate for "does this question render in a NEW
 * audit?" — driven by FR-103. Note that the audit-LOG and any past
 * snapshot still references whatever `question_version_id` was active
 * at the time of publication; this helper only governs new traversals.
 */
export function isQuestionRenderableInNewAudit(
  q: EligibilityCandidate,
  args: EligibilityArgs,
): boolean {
  if (q.status !== "published") return false;
  if (!q.auditLevels.includes(args.tier)) return false;
  if (q.hotelTypes && q.hotelTypes.length > 0) {
    if (!args.hotelType) return false;
    if (!q.hotelTypes.includes(args.hotelType)) return false;
  }
  return true;
}

export interface TranslationRow {
  language: string;
  prompt: string;
  helper: string | null;
  optionLabels: unknown;
}

export interface PickedTranslation {
  translation: TranslationRow | null;
  languageUsed: string;
  /** FR-104 indicator: true when the canonical-FR translation was substituted
   *  because the requested language had no row for this question version. */
  fallbackUsed: boolean;
}

/**
 * Implements FR-104: try the requested language; if absent, fall back to
 * `CANONICAL_LANGUAGE` and flag `fallbackUsed=true` so the render layer
 * can show a visible indicator. Returns `{ translation: null, ... }` only
 * when neither row exists — that signals a missing canonical translation
 * (a data-integrity problem, not a render decision).
 */
export function pickTranslation(
  versionTranslations: TranslationRow[],
  language: string,
): PickedTranslation {
  const wanted = versionTranslations.find((t) => t.language === language);
  if (wanted) {
    return { translation: wanted, languageUsed: language, fallbackUsed: false };
  }
  const fallback = versionTranslations.find(
    (t) => t.language === CANONICAL_LANGUAGE,
  );
  if (fallback) {
    return {
      translation: fallback,
      languageUsed: CANONICAL_LANGUAGE,
      fallbackUsed: true,
    };
  }
  return { translation: null, languageUsed: language, fallbackUsed: false };
}
