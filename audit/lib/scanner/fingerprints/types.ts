/**
 * Vendor fingerprint contract (T033).
 *
 * Each per-category file exports a list of fingerprints. The scanner runner
 * (T037) applies each fingerprint against the rendered page's script srcs,
 * iframe origins, anchor hrefs, and known meta tags; the highest-confidence
 * match per category wins. Multiple matches per category are surfaced when
 * they are non-overlapping (e.g., two booking-engine candidates flagged
 * "conflict — verify").
 */

export type FingerprintConfidence = "high" | "medium" | "low";

export interface VendorFingerprint {
  vendor_slug: string;
  display_name: string;
  /** RegExp source strings tested against `<script src>`. */
  script_patterns?: string[];
  /** RegExp source strings tested against `<iframe src>`. */
  iframe_patterns?: string[];
  /** RegExp source strings tested against `<a href>` / booking-button targets. */
  url_patterns?: string[];
  /** RegExp source strings tested against `<meta>`/`<link>` content. */
  meta_patterns?: string[];
  confidence: FingerprintConfidence;
}

export interface FingerprintCategory {
  category:
    | "booking_engine"
    | "pms"
    | "channel_manager"
    | "crm"
    | "guest_messaging";
  fingerprints: VendorFingerprint[];
}

export function compilePatterns(
  patterns?: string[],
): RegExp[] {
  return (patterns ?? []).map((p) => new RegExp(p, "i"));
}
