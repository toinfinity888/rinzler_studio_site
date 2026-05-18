import * as React from "react";
import Link from "next/link";

import type { UpgradeCta as UpgradeCtaShape } from "@/lib/scanner/get-public-result";

export function UpgradeCta({ cta }: { cta: UpgradeCtaShape }) {
  const tierLabel = cta.next_tier === "full" ? "Diagnostic complet" : "Mini-audit";
  return (
    <section className="glass rounded-md p-6">
      <h2 className="text-lg font-semibold">Aller plus loin : {tierLabel}</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Durée estimée : environ {cta.estimated_minutes} minutes. Ce que vous
        obtenez en plus du scan gratuit :
      </p>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {cta.differences_from_free.map((d, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-accent-cyan">→</span>
            <span>{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-2 glass min-h-11 px-6 py-3 rounded-sm font-medium hover:[background:rgba(255,255,255,0.14)]"
        >
          Voir les formules
        </Link>
      </div>
    </section>
  );
}
