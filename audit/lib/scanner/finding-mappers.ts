/**
 * Map raw scanner observations -> `scan_findings` rows (T036).
 *
 * Each call returns an array of rows ready for `db.insert(scanFindings)`.
 * The mappers are pure: no DB, no IO. They are unit-testable.
 *
 * Field naming convention (per data-model.md §B): snake_case, scoped by
 * subsystem. Examples:
 *   - `lcp_ms`, `cls`, `lighthouse_performance`
 *   - `schema_hotel_present`, `faq_present`, `hreflang_count`
 *   - `whatsapp_visible`, `messenger_visible`, `phone_visible`
 *   - `booking_button_target`, `booking_button_external`
 *   - `vendor_booking_engine`, `vendor_pms`, `vendor_channel_manager`, etc.
 */

import type { FindingConfidence } from "@/db/schema";

import type { DomSignals } from "./dom-extractors";
import type { LighthouseResult } from "./lighthouse-runner";
import { ALL_FINGERPRINT_CATEGORIES } from "./fingerprints";
import { compilePatterns, type VendorFingerprint } from "./fingerprints/types";

export interface FindingRow {
  field: string;
  valueJson: unknown;
  evidence: unknown;
  confidence: FindingConfidence;
}

export function lighthouseToFindings(
  lh: LighthouseResult,
  formFactor: "desktop" | "mobile",
): FindingRow[] {
  const out: FindingRow[] = [];
  const tagFor = (k: string) => `lighthouse_${formFactor}_${k}`;
  const pushIf = (
    k: string,
    v: number | null,
    confidence: FindingConfidence = "high",
  ) => {
    if (v != null) {
      out.push({
        field: tagFor(k),
        valueJson: v,
        evidence: { source: "lighthouse" },
        confidence,
      });
    }
  };
  pushIf("performance", lh.performance);
  pushIf("accessibility", lh.accessibility);
  pushIf("best_practices", lh.bestPractices);
  pushIf("seo", lh.seo);
  pushIf("lcp_ms", lh.lcpMs);
  pushIf("cls", lh.cls);
  if (lh.runtimeError) {
    out.push({
      field: tagFor("error"),
      valueJson: lh.runtimeError,
      evidence: { source: "lighthouse" },
      confidence: "low",
    });
  }
  return out;
}

export function domToFindings(signals: DomSignals): FindingRow[] {
  return [
    {
      field: "schema_hotel_present",
      valueJson: signals.schemaHotelPresent,
      evidence: { json_ld_blocks: signals.schemaJsonLd.length },
      confidence: signals.schemaHotelPresent ? "high" : "medium",
    },
    {
      field: "faq_present",
      valueJson: signals.faqHeuristicMatched,
      evidence: { source: "dom_heuristic" },
      confidence: "medium",
    },
    {
      field: "whatsapp_visible",
      valueJson: signals.whatsappLinkCount > 0,
      evidence: { link_count: signals.whatsappLinkCount },
      confidence: "high",
    },
    {
      field: "messenger_visible",
      valueJson: signals.messengerLinkCount > 0,
      evidence: { link_count: signals.messengerLinkCount },
      confidence: "high",
    },
    {
      field: "phone_visible",
      valueJson: signals.telLinkCount > 0,
      evidence: { link_count: signals.telLinkCount },
      confidence: "high",
    },
    {
      field: "hreflang_languages",
      valueJson: signals.hreflangLanguages,
      evidence: { source: "link[rel=alternate]" },
      confidence: signals.hreflangLanguages.length > 0 ? "high" : "medium",
    },
    {
      field: "og_tags_present",
      valueJson: Object.keys(signals.ogTags).length > 0,
      evidence: signals.ogTags,
      confidence: "high",
    },
    {
      field: "booking_button_target",
      valueJson: signals.bookingButtonHref,
      evidence: { external: signals.bookingButtonExternalDomain },
      confidence: signals.bookingButtonHref ? "high" : "low",
    },
    {
      field: "booking_button_external",
      valueJson: signals.bookingButtonExternalDomain,
      evidence: { href: signals.bookingButtonHref },
      confidence: signals.bookingButtonHref ? "high" : "low",
    },
    {
      field: "contact_page_detected",
      valueJson: signals.contactPageDetected,
      evidence: { source: "anchor_text_match" },
      confidence: "medium",
    },
  ];
}

interface FingerprintMatch {
  vendorSlug: string;
  displayName: string;
  matchedOn: "script_src" | "iframe_src" | "url" | "meta";
  matchedValue: string;
  confidence: FindingConfidence;
}

export function vendorFingerprintFindings(signals: DomSignals): FindingRow[] {
  const matches: Record<string, FingerprintMatch[]> = {};

  const tryMatch = (
    category: string,
    fp: VendorFingerprint,
    candidates: string[],
    matchedOn: FingerprintMatch["matchedOn"],
    patterns: RegExp[],
  ) => {
    for (const candidate of candidates) {
      for (const re of patterns) {
        if (re.test(candidate)) {
          (matches[category] ??= []).push({
            vendorSlug: fp.vendor_slug,
            displayName: fp.display_name,
            matchedOn,
            matchedValue: candidate,
            confidence: fp.confidence,
          });
          return;
        }
      }
    }
  };

  for (const cat of ALL_FINGERPRINT_CATEGORIES) {
    for (const fp of cat.fingerprints) {
      tryMatch(cat.category, fp, signals.scriptSrcs, "script_src", compilePatterns(fp.script_patterns));
      tryMatch(cat.category, fp, signals.iframeSrcs, "iframe_src", compilePatterns(fp.iframe_patterns));
      tryMatch(cat.category, fp, signals.anchorHrefs, "url", compilePatterns(fp.url_patterns));
    }
  }

  return Object.entries(matches).map(([category, matchList]) => ({
    field: `vendor_${category}`,
    valueJson: matchList.map((m) => ({
      slug: m.vendorSlug,
      display_name: m.displayName,
      matched_on: m.matchedOn,
      matched_value: m.matchedValue,
    })),
    evidence: { match_count: matchList.length },
    confidence: matchList[0]?.confidence ?? "low",
  }));
}

/**
 * Helper used for the non-hotel guard: a site is plausibly a hotel if the
 * Hotel schema is present OR a booking-button + booking-vendor signal exists
 * OR hospitality keywords occur in the OG description.
 */
export function looksLikeHotel(signals: DomSignals): boolean {
  if (signals.schemaHotelPresent) return true;
  if (signals.bookingButtonHref) return true;
  const desc = signals.ogTags["og:description"] ?? "";
  if (/hotel|hôtel|aparthotel|maison d'hôtes|guesthouse|bed and breakfast/i.test(desc)) {
    return true;
  }
  return false;
}
