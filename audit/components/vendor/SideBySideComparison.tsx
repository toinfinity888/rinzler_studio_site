import * as React from "react";

import type { vendors, vendorTranslations } from "@/db/schema";

type Vendor = typeof vendors.$inferSelect;
type Translation = typeof vendorTranslations.$inferSelect;

export interface SideBySideComparisonProps {
  vendors: Vendor[];
  translations: Record<string, Translation[]>;
  language?: string;
}

const FIELDS: Array<{ key: keyof Vendor; label: string }> = [
  { key: "category", label: "Catégorie" },
  { key: "priceTier", label: "Tarification" },
  { key: "implementationComplexity", label: "Complexité" },
  { key: "frenchMarketRelevance", label: "Pertinence FR" },
  { key: "gdprPosture", label: "Posture GDPR" },
  { key: "euHosting", label: "Hébergement EU" },
  { key: "apiAvailability", label: "API" },
  { key: "supportAvailability", label: "Support" },
];

export function SideBySideComparison({
  vendors,
  translations,
  language = "fr",
}: SideBySideComparisonProps) {
  if (vendors.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Sélectionnez au moins un vendeur pour la comparaison.
      </p>
    );
  }
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-text-muted border-b border-white/10">
            <th className="px-3 py-2 font-medium">Champ</th>
            {vendors.map((v) => (
              <th key={v.id} className="px-3 py-2 font-medium text-text-primary">
                {v.slug}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIELDS.map((f) => (
            <tr key={String(f.key)} className="border-b border-white/5">
              <td className="px-3 py-2 text-text-muted">{f.label}</td>
              {vendors.map((v) => (
                <td key={v.id} className="px-3 py-2 text-text-secondary">
                  {String(v[f.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-b border-white/5">
            <td className="px-3 py-2 text-text-muted">Forces</td>
            {vendors.map((v) => {
              const t = (translations[v.id] ?? []).find((tr) => tr.language === language);
              return (
                <td key={v.id} className="px-3 py-2 text-text-secondary">
                  <ul className="list-disc pl-4">
                    {(t?.strengths ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </td>
              );
            })}
          </tr>
          <tr className="border-b border-white/5">
            <td className="px-3 py-2 text-text-muted">Limites</td>
            {vendors.map((v) => {
              const t = (translations[v.id] ?? []).find((tr) => tr.language === language);
              return (
                <td key={v.id} className="px-3 py-2 text-text-secondary">
                  <ul className="list-disc pl-4">
                    {(t?.limitations ?? []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
