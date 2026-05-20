/**
 * Compliance findings — delegates to the bilingual library under
 * `lib/compliance/` (US 7 / T112+T113). The engine call site stays
 * untouched; the new evaluator handles FR/EN selection from the hotel's
 * primary_language and is data-driven so new patterns are added by
 * extending the library, not by editing this file.
 *
 * FR-050 / FR-051 / FR-052 — surface risk areas with a checklist item,
 * never provide legal advice or recommend a specific product.
 */
import type { ComplianceFinding, RecommendationContext } from "../types";
import { evaluateCompliance } from "@/lib/compliance/evaluator";

export function generateComplianceFindings(
  ctx: RecommendationContext,
): ComplianceFinding[] {
  return evaluateCompliance(ctx);
}
