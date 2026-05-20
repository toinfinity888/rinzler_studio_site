import { describe, it, expect } from "vitest";

import {
  traceRecommendation,
  enumerateSignalKeys,
  type TraceableRecommendation,
} from "@/lib/governance/traceability";
import type {
  AnswerInput,
  ScanFindingInput,
  VendorCatalogueEntry,
} from "@/lib/recommend/types";

/**
 * T130 — Traceability contract (FR-113 / SC-010 / SC-011).
 *
 * `traceRecommendation()` must enumerate exactly the same set of signals
 * that `recommendations.signals_consulted` records. The trace adds *value*
 * to each entry (so the consultant UI doesn't re-fetch raw data) but the
 * key set MUST stay identical — otherwise the "why was this suggested"
 * drill-down would lie.
 */

function makeRec(
  overrides: Partial<TraceableRecommendation> = {},
): TraceableRecommendation {
  return {
    id: "r1",
    vendor_id: "v1",
    signals_consulted: {
      answers: ["uses_ai_in_guest_replies", "captures_guest_emails"],
      scan_findings: ["has_booking_button"],
      vendor_fields: ["gdprPosture", "euHosting"],
    },
    ...overrides,
  };
}

function makeVendor(overrides: Partial<VendorCatalogueEntry> = {}): VendorCatalogueEntry {
  return {
    id: "v1",
    slug: "alpha-pms",
    category: "pms",
    currentVersionId: "vv1",
    category_label: "PMS",
    targetHotelSizes: ["small"],
    targetPropertyTypes: ["independent"],
    countriesServed: ["FR"],
    languagesSupported: ["fr"],
    independentHotelSuitability: "high",
    smallHotelSuitability: "high",
    implementationComplexity: "medium",
    priceTier: "mid",
    frenchMarketRelevance: "high",
    gdprPosture: "compliant",
    euHosting: "yes",
    aiFeatures: [],
    automationCapabilities: [],
    tags: [],
    confidence: "high",
    ...overrides,
  };
}

describe("traceability — keys match signals_consulted (T130 / FR-113)", () => {
  it("returns the exact same key set as signals_consulted", () => {
    const rec = makeRec();
    const trace = traceRecommendation(rec);
    const keys = enumerateSignalKeys(rec);

    expect(trace.answers.map((e) => e.key)).toEqual(keys.answers);
    expect(trace.scan_findings.map((e) => e.key)).toEqual(keys.scan_findings);
    expect(trace.vendor_fields.map((e) => e.key)).toEqual(keys.vendor_fields);
  });

  it("preserves the enumeration when no enrichment context is provided", () => {
    const rec = makeRec();
    const trace = traceRecommendation(rec, {});
    for (const e of [
      ...trace.answers,
      ...trace.scan_findings,
      ...trace.vendor_fields,
    ]) {
      expect(e.value).toBeNull();
      expect(e.confidence).toBeNull();
    }
  });

  it("fills values from supplied context (answers, scan, vendor catalogue)", () => {
    const answers: AnswerInput[] = [
      {
        question_slug: "uses_ai_in_guest_replies",
        question_version_id: null,
        value: "yes",
        source: "client",
        confidence: "high",
      },
      {
        question_slug: "captures_guest_emails",
        question_version_id: null,
        value: "yes",
        source: "client",
        confidence: "medium",
      },
    ];
    const scan: ScanFindingInput[] = [
      { field: "has_booking_button", value: true, confidence: "high" },
    ];
    const vendor = makeVendor({ gdprPosture: "compliant", euHosting: "yes" });

    const trace = traceRecommendation(makeRec(), {
      answers,
      scanFindings: scan,
      vendorCatalogue: [vendor],
    });

    expect(trace.answers[0]?.value).toBe("yes");
    expect(trace.answers[0]?.confidence).toBe("high");
    expect(trace.answers[1]?.confidence).toBe("medium");
    expect(trace.scan_findings[0]?.value).toBe(true);
    expect(trace.vendor_fields[0]?.value).toBe("compliant");
    expect(trace.vendor_fields[1]?.value).toBe("yes");
    expect(trace.vendor_fields[0]?.label).toBe("vendor.alpha-pms.gdprPosture");
  });

  it("handles recommendations with no vendor_id (vendor_fields still enumerated, value=null)", () => {
    const rec = makeRec({ vendor_id: null });
    const trace = traceRecommendation(rec);
    expect(trace.vendor_fields).toHaveLength(2);
    for (const e of trace.vendor_fields) {
      expect(e.value).toBeNull();
      expect(e.label.startsWith("vendor.")).toBe(true);
    }
  });

  it("emits empty arrays when signals_consulted is empty", () => {
    const rec = makeRec({
      signals_consulted: { answers: [], scan_findings: [], vendor_fields: [] },
    });
    const trace = traceRecommendation(rec);
    expect(trace.answers).toEqual([]);
    expect(trace.scan_findings).toEqual([]);
    expect(trace.vendor_fields).toEqual([]);
  });
});
