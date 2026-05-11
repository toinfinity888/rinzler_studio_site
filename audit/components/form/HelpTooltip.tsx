"use client";

import * as React from "react";

/**
 * Mirrors the marketing site's `.info-tooltip-trigger` pattern from
 * src/calculator.html — info icon, hover/tap reveal, accessible via
 * `aria-describedby` linking the trigger to the tooltip body.
 */
export interface HelpTooltipProps {
  id: string;
  text: string;
}

export function HelpTooltip({ id, text }: HelpTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const tooltipId = `${id}__help`;
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-text-muted hover:text-accent-cyan focus-visible:text-accent-cyan focus:outline-none transition-colors duration-[var(--duration-fast)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.4-1 1-1 1.7v.5" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
        <span className="sr-only">Aide pour ce champ</span>
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={[
          "absolute left-0 top-7 z-50 max-w-xs px-3 py-2 rounded-md text-xs text-text-primary glass leading-relaxed",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          "transition-opacity duration-[var(--duration-fast)]",
        ].join(" ")}
      >
        {text}
      </span>
    </span>
  );
}
