/**
 * T113 — Compliance evaluator.
 *
 * Pure function. Walks the curated findings library against a recommendation
 * context, picks the active language (from `hotel.primary_language`, default
 * `fr`), and returns `ComplianceFinding[]` ready to be embedded in the
 * `EngineOutput`. Per-vendor patterns iterate over the project's vendor
 * catalogue, substituting `{slug}` in the localised copy.
 *
 * Two extra fields are emitted compared to the legacy inline rules:
 *  - `id`: pattern id from the library (anchor for the consultant UI and
 *     for the contract tests targeting specific patterns).
 *  - `language`: which copy was rendered.
 * Both are appended via the existing flexible `ComplianceFinding` shape's
 * `topic` field — actually, the schema only carries `topic`, so we keep the
 * library `id` aligned with `topic` plus the contract-test usage. The two
 * are intentionally identical for global patterns and prefixed for per-
 * vendor patterns so a single `find(topic === 'eu_hosting_unknown')` works
 * regardless of vendor count.
 */
import type {
  ComplianceFinding,
  RecommendationContext,
} from "@/lib/recommend/types";

import {
  COMPLIANCE_FINDINGS_LIBRARY,
  type ComplianceFindingPattern,
} from "./findings-library";

export type SupportedLanguage = "fr" | "en";

export interface EvaluateOptions {
  /**
   * Force a language. If omitted, derives from `ctx.hotel.primary_language`
   * (anything other than "en" → "fr" to preserve the legacy default).
   */
  language?: SupportedLanguage;
  /**
   * Optional override of the pattern library, mostly used by tests to
   * exercise edge cases without polluting the curated set.
   */
  library?: ComplianceFindingPattern[];
}

function pickLanguage(ctx: RecommendationContext, override?: SupportedLanguage): SupportedLanguage {
  if (override) return override;
  return (ctx.hotel.primary_language ?? "fr").toLowerCase() === "en" ? "en" : "fr";
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_m, key: string) => vars[key] ?? `{${key}}`);
}

export function evaluateCompliance(
  ctx: RecommendationContext,
  options: EvaluateOptions = {},
): ComplianceFinding[] {
  const lang = pickLanguage(ctx, options.language);
  const library = options.library ?? COMPLIANCE_FINDINGS_LIBRARY;
  const out: ComplianceFinding[] = [];

  for (const pattern of library) {
    if (pattern.scope === "global") {
      if (!pattern.matches(ctx)) continue;
      const copy = pattern.copy[lang];
      out.push({
        topic: pattern.topic,
        severity: pattern.severity,
        explanation: copy.explanation,
        checklist_item: copy.checklist_item,
        vendor_id: null,
      });
      continue;
    }

    // Per-vendor pattern: emit one finding per matching vendor.
    for (const v of ctx.vendorCatalogue) {
      if (!pattern.matches(ctx, v)) continue;
      const vars = { slug: v.slug };
      const copy = pattern.copy[lang];
      out.push({
        topic: pattern.topic,
        severity: pattern.severity,
        explanation: substitute(copy.explanation, vars),
        checklist_item: substitute(copy.checklist_item, vars),
        vendor_id: v.id,
      });
    }
  }

  return out;
}
