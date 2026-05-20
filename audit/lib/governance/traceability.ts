/**
 * T129 — Recommendation traceability (FR-113).
 *
 * Given a recommendation (or its persisted form), enumerates the signals
 * the engine consulted to produce it:
 *
 *   { answers: SignalEntry[], scan_findings: SignalEntry[], vendor_fields: SignalEntry[] }
 *
 * The enumeration MUST match exactly what's stored in
 * `recommendations.signals_consulted`. The contract test (T130) walks every
 * recommendation row and verifies set-equality.
 *
 * On top of the stored set, the function enriches each entry with the
 * *actual value* (when supplied via `context`) — so the consultant UI
 * doesn't have to re-fetch raw answers or scan findings to render
 * "why was this suggested".
 *
 * Pure function. No DB access.
 */
import type {
  RuleRecommendation,
  SignalsConsulted,
  AnswerInput,
  ScanFindingInput,
  VendorCatalogueEntry,
} from "@/lib/recommend/types";

export interface SignalEntry {
  /** Stable key (answer question_slug / scan field / vendor field name). */
  key: string;
  /**
   * The actual value at evaluation time, if the caller passed in the
   * matching context. `null` when not provided (the trace still lists the
   * key — set-equality with `signals_consulted` is preserved).
   */
  value: unknown;
  /** Confidence of the underlying source (answer / scan / vendor-field). */
  confidence: string | null;
  /** Where the value came from. */
  source: SignalSource;
  /** Human-readable label hint, e.g., "vendor.alpha.gdpr_posture". */
  label: string;
}

export type SignalSource =
  | "answer"
  | "scan_finding"
  | "vendor_field"
  | "unknown";

export interface TraceContext {
  answers?: AnswerInput[];
  scanFindings?: ScanFindingInput[];
  vendorCatalogue?: VendorCatalogueEntry[];
  /** The recommendation's own vendor row — speeds up vendor-field lookup. */
  vendor?: VendorCatalogueEntry;
}

export interface RecommendationTrace {
  answers: SignalEntry[];
  scan_findings: SignalEntry[];
  vendor_fields: SignalEntry[];
}

/**
 * The minimal recommendation shape this helper accepts — works for both
 * the in-memory `RuleRecommendation` from the engine and a persisted
 * `recommendations` row whose `signals_consulted` jsonb has been decoded.
 */
export interface TraceableRecommendation {
  id: string;
  vendor_id: string | null;
  signals_consulted: SignalsConsulted;
}

export function traceRecommendation(
  rec: TraceableRecommendation | RuleRecommendation,
  context: TraceContext = {},
): RecommendationTrace {
  const answerMap = new Map<string, AnswerInput>();
  for (const a of context.answers ?? []) answerMap.set(a.question_slug, a);

  const scanMap = new Map<string, ScanFindingInput>();
  for (const s of context.scanFindings ?? []) scanMap.set(s.field, s);

  const vendor =
    context.vendor ??
    (rec.vendor_id
      ? context.vendorCatalogue?.find((v) => v.id === rec.vendor_id) ?? null
      : null);

  return {
    answers: rec.signals_consulted.answers.map((slug) => {
      const a = answerMap.get(slug);
      return {
        key: slug,
        value: a?.value ?? null,
        confidence: a?.confidence ?? null,
        source: "answer",
        label: `answer.${slug}`,
      };
    }),
    scan_findings: rec.signals_consulted.scan_findings.map((field) => {
      const s = scanMap.get(field);
      return {
        key: field,
        value: s?.value ?? null,
        confidence: s?.confidence ?? null,
        source: "scan_finding",
        label: `scan.${field}`,
      };
    }),
    vendor_fields: rec.signals_consulted.vendor_fields.map((field) => {
      const value = vendor ? readVendorField(vendor, field) : null;
      return {
        key: field,
        value,
        confidence: vendor?.confidence ?? null,
        source: "vendor_field",
        label: vendor ? `vendor.${vendor.slug}.${field}` : `vendor.${field}`,
      };
    }),
  };
}

/**
 * Returns the same keys as `rec.signals_consulted`, but as a flat array
 * suitable for set-equality assertions in tests. Order is preserved so
 * snapshot diffs are stable.
 */
export function enumerateSignalKeys(
  rec: TraceableRecommendation,
): { answers: string[]; scan_findings: string[]; vendor_fields: string[] } {
  return {
    answers: [...rec.signals_consulted.answers],
    scan_findings: [...rec.signals_consulted.scan_findings],
    vendor_fields: [...rec.signals_consulted.vendor_fields],
  };
}

function readVendorField(
  vendor: VendorCatalogueEntry,
  field: string,
): unknown {
  return (vendor as unknown as Record<string, unknown>)[field] ?? null;
}