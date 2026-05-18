import * as React from "react";

import type { DetectedVendor } from "@/lib/scanner/get-public-result";

const CATEGORY_LABEL: Record<string, string> = {
  booking_engine: "Moteur de réservation",
  pms: "PMS",
  channel_manager: "Channel manager",
  crm: "CRM",
  guest_messaging: "Messagerie client",
};

export function DetectedVendorList({ vendors }: { vendors: DetectedVendor[] }) {
  if (vendors.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Aucun outil métier n'a été identifié automatiquement depuis votre page
        d'accueil. C'est fréquent — beaucoup de sites masquent l'intégration.
      </p>
    );
  }
  // Group by category.
  const byCategory = new Map<string, DetectedVendor[]>();
  for (const v of vendors) {
    const arr = byCategory.get(v.category) ?? [];
    arr.push(v);
    byCategory.set(v.category, arr);
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {Array.from(byCategory.entries()).map(([category, vs]) => (
        <li key={category} className="glass rounded-md p-4">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">
            {CATEGORY_LABEL[category] ?? category}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {vs.map((v) => v.display_name).join(", ")}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            Détecté sur : {vs.map((v) => v.matched_on).join(", ")}
          </div>
        </li>
      ))}
    </ul>
  );
}
