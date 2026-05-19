import * as React from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FreshnessIndicator } from "./FreshnessIndicator";

export interface VendorCardVendor {
  id: string;
  slug: string;
  category: string;
  status: string;
  currentVersion: number;
  frenchMarketRelevance: string | null;
  gdprPosture: string | null;
  euHosting: string | null;
  priceTier: string | null;
  tags: string[] | null;
  updatedAt: Date;
}

export function VendorCard({ vendor }: { vendor: VendorCardVendor }) {
  return (
    <Card className="!p-4 md:!p-5 hover:[background:rgba(255,255,255,0.03)] transition-colors">
      <Link
        href={`/admin/vendors/${vendor.id}/edit`}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-cyan"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-text-primary truncate">{vendor.slug}</div>
            <div className="text-[11px] text-text-muted">
              {vendor.category} · v{vendor.currentVersion}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {vendor.status === "retired" ? (
              <span className="text-[11px] text-warning border border-warning/40 rounded-sm px-1.5 py-0.5">
                Retiré
              </span>
            ) : (
              <span className="text-[11px] text-success border border-success/40 rounded-sm px-1.5 py-0.5">
                Actif
              </span>
            )}
            <FreshnessIndicator lastVerifiedAt={vendor.updatedAt} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {vendor.frenchMarketRelevance ? (
            <span className="px-1.5 py-0.5 border border-white/10 rounded-sm text-text-secondary">
              FR · {vendor.frenchMarketRelevance}
            </span>
          ) : null}
          {vendor.gdprPosture ? (
            <span className="px-1.5 py-0.5 border border-white/10 rounded-sm text-text-secondary">
              GDPR · {vendor.gdprPosture}
            </span>
          ) : null}
          {vendor.euHosting ? (
            <span className="px-1.5 py-0.5 border border-white/10 rounded-sm text-text-secondary">
              EU host · {vendor.euHosting}
            </span>
          ) : null}
          {vendor.priceTier ? (
            <span className="px-1.5 py-0.5 border border-white/10 rounded-sm text-text-secondary">
              {vendor.priceTier}
            </span>
          ) : null}
          {(vendor.tags ?? []).slice(0, 4).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 border border-white/10 rounded-sm text-text-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      </Link>
    </Card>
  );
}
