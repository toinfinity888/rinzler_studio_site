import type { FingerprintCategory } from "./types";

export const CHANNEL_MANAGER: FingerprintCategory = {
  category: "channel_manager",
  fingerprints: [
    {
      vendor_slug: "siteminder",
      display_name: "SiteMinder",
      script_patterns: ["siteminder\\.com"],
      confidence: "medium",
    },
    {
      vendor_slug: "d_edge",
      display_name: "D-EDGE Distribution",
      script_patterns: ["d-edge\\.com/distribution"],
      confidence: "medium",
    },
  ],
};
