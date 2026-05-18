import type { FingerprintCategory } from "./types";

export const CRM: FingerprintCategory = {
  category: "crm",
  fingerprints: [
    {
      vendor_slug: "experience_hotel",
      display_name: "Experience Hotel",
      script_patterns: ["experiencehotel\\.com"],
      confidence: "medium",
    },
    {
      vendor_slug: "revinate",
      display_name: "Revinate",
      script_patterns: ["revinate\\.com"],
      confidence: "medium",
    },
  ],
};
