import * as React from "react";

import type {
  RenderedSourceLabel,
  SourceTone,
} from "@/lib/governance/source-label";

const TONE_CLASS: Record<SourceTone, string> = {
  trusted:
    "[background:rgba(46,204,113,0.12)] text-[#7dd6a3] [border:1px_solid_rgba(46,204,113,0.35)]",
  neutral:
    "[background:rgba(255,255,255,0.06)] text-text-secondary [border:1px_solid_rgba(255,255,255,0.10)]",
  caution:
    "[background:rgba(241,196,15,0.10)] text-[#f1c40f] [border:1px_solid_rgba(241,196,15,0.35)]",
  warning:
    "[background:rgba(231,76,60,0.10)] text-[#e74c3c] [border:1px_solid_rgba(231,76,60,0.35)]",
};

export interface SourceLabelChipProps {
  label: RenderedSourceLabel;
  className?: string;
}

export function SourceLabelChip({ label, className = "" }: SourceLabelChipProps) {
  return (
    <span
      title={label.detail}
      data-stale={label.isStale ? "true" : "false"}
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-medium",
        TONE_CLASS[label.tone],
        className,
      ].join(" ")}
    >
      {label.label}
    </span>
  );
}
