import type { FingerprintCategory } from "./types";

/**
 * Booking-engine fingerprints — starter set (T033).
 *
 * Heuristics: domains observed in real-world hotel pages (script srcs +
 * iframe origins + book-now button targets). These intentionally err toward
 * "high confidence" — the cost of a false positive is a corrected display
 * name in the report; the cost of a false negative is a missed vendor.
 */
export const BOOKING_ENGINE: FingerprintCategory = {
  category: "booking_engine",
  fingerprints: [
    {
      vendor_slug: "d_edge",
      display_name: "D-EDGE",
      script_patterns: ["d-edge\\.com", "availpro\\.com"],
      iframe_patterns: ["d-edge\\.com", "availpro\\.com"],
      url_patterns: ["d-edge\\.com", "availpro\\.com"],
      confidence: "high",
    },
    {
      vendor_slug: "mews",
      display_name: "Mews",
      script_patterns: ["mews(systems)?\\.com", "mews-distributor"],
      iframe_patterns: ["mews(systems)?\\.com"],
      url_patterns: ["mews\\.com/(book|distributor)"],
      confidence: "high",
    },
    {
      vendor_slug: "cloudbeds",
      display_name: "Cloudbeds",
      script_patterns: ["cloudbeds\\.com", "myfrontdesk\\.com"],
      iframe_patterns: ["cloudbeds\\.com"],
      url_patterns: ["cloudbeds\\.com"],
      confidence: "high",
    },
    {
      vendor_slug: "amenitiz",
      display_name: "Amenitiz",
      script_patterns: ["amenitiz\\.io", "amenitiz\\.com"],
      iframe_patterns: ["amenitiz\\.io", "amenitiz\\.com"],
      url_patterns: ["amenitiz\\."],
      confidence: "high",
    },
    {
      vendor_slug: "siteminder",
      display_name: "SiteMinder",
      script_patterns: ["siteminder\\.com", "thebookingbutton\\.com"],
      iframe_patterns: ["siteminder\\.com", "thebookingbutton\\.com"],
      url_patterns: ["thebookingbutton\\.com"],
      confidence: "high",
    },
  ],
};
