"use client";

import * as React from "react";

import { trackEvent } from "@/lib/analytics/events";
import { BAND_COLOR } from "./types";
import type { Band } from "./types";

interface Props {
  vendorId: string;
  vendorVersionId: string;
  name: string;
  category?: string;
  reason: string;
  confidence: Band;
}

/**
 * Client island so `vendor_shortlist_clicked` (T157) fires on interaction.
 * The hit area is the whole tile — keyboard users get the same affordance
 * via the underlying <button>. No navigation happens; the event is just
 * a hint that someone is exploring a vendor row, used to gauge whether
 * the shortlist is read at all.
 */
export function ShortlistItem({
  vendorId,
  vendorVersionId,
  name,
  category,
  reason,
  confidence,
}: Props) {
  const handleClick = () => {
    trackEvent("vendor_shortlist_clicked", {
      vendor_id: vendorId,
      vendor_version_id: vendorVersionId,
      category: category ?? null,
    });
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className="block w-full text-left rounded-md px-3 py-2 [background:var(--color-bg-tertiary)] hover:[background:rgba(255,255,255,0.06)] transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{name}</span>
        <span className="text-[10px] uppercase tracking-wide text-text-muted">
          {category}
        </span>
        <span className={`ml-auto text-[10px] ${BAND_COLOR[confidence]}`}>
          conf. {confidence}
        </span>
      </div>
      <p className="text-xs text-text-secondary">{reason}</p>
    </button>
  );
}
