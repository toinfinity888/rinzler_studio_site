import type { FingerprintCategory } from "./types";

export const GUEST_MESSAGING: FingerprintCategory = {
  category: "guest_messaging",
  fingerprints: [
    {
      vendor_slug: "whatsapp_business",
      display_name: "WhatsApp Business",
      url_patterns: ["wa\\.me/", "api\\.whatsapp\\.com/send"],
      confidence: "high",
    },
    {
      vendor_slug: "messenger",
      display_name: "Facebook Messenger",
      url_patterns: ["m\\.me/"],
      confidence: "high",
    },
    {
      vendor_slug: "hijiffy",
      display_name: "HiJiffy",
      script_patterns: ["hijiffy\\.com"],
      confidence: "medium",
    },
    {
      vendor_slug: "asksuite",
      display_name: "Asksuite",
      script_patterns: ["asksuite\\.com"],
      confidence: "medium",
    },
  ],
};
