import type { FingerprintCategory } from "./types";

/**
 * PMS fingerprints (T033). PMS detection from the public website is INDIRECT
 * — the PMS itself is rarely visible, but its booking engine / channel
 * manager often is, and the choice of those is a strong heuristic.
 *
 * These entries are explicitly "medium" confidence: the scanner should mark
 * the finding as inferred rather than confirmed.
 */
export const PMS: FingerprintCategory = {
  category: "pms",
  fingerprints: [
    {
      vendor_slug: "mews",
      display_name: "Mews",
      script_patterns: ["mews(systems)?\\.com/.*"],
      iframe_patterns: ["mewssystems\\.com"],
      confidence: "medium",
    },
    {
      vendor_slug: "cloudbeds",
      display_name: "Cloudbeds",
      script_patterns: ["cloudbeds\\.com/.*"],
      confidence: "medium",
    },
    {
      vendor_slug: "amenitiz",
      display_name: "Amenitiz",
      script_patterns: ["amenitiz\\.(io|com)/.*"],
      confidence: "medium",
    },
  ],
};
