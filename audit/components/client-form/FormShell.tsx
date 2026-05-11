"use client";

import * as React from "react";
import Link from "next/link";
import { AutosaveIndicator } from "./AutosaveIndicator";
import type { AutosaveState } from "@/lib/client-form/autosave";

export interface FormShellProps {
  token: string;
  sectionIndex: number; // 1..8
  totalSections: number;
  completionPct: number | null;
  saveState: AutosaveState;
  staleConflict?: boolean;
  onReloadOnStale?: () => void;
  children: React.ReactNode;
  prevHref?: string | null;
  nextHref?: string | null;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}

export function FormShell({
  sectionIndex,
  totalSections,
  completionPct,
  saveState,
  staleConflict,
  onReloadOnStale,
  children,
  prevHref,
  nextHref,
  onPrev,
  onNext,
  nextLabel,
}: FormShellProps) {
  const pct = completionPct ?? Math.round((sectionIndex - 1) * (100 / totalSections));
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            Section {sectionIndex} / {totalSections}
          </span>
          <AutosaveIndicator state={saveState} />
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full [background:var(--color-bg-tertiary)]">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-[var(--duration-normal)]"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--color-accent-cyan), var(--color-accent-purple))",
            }}
          />
        </div>
        <p className="text-xs text-text-muted text-right">{pct}% complété</p>
      </div>

      {staleConflict ? (
        <div
          role="alert"
          className="rounded-md p-4 [background:rgba(255,170,0,0.08)] [border:1px_solid_var(--color-warning)] text-sm text-warning flex items-center justify-between gap-4"
        >
          <span>Cet audit a été modifié dans une autre fenêtre.</span>
          <button
            type="button"
            onClick={onReloadOnStale}
            className="text-warning underline hover:text-warning/80"
          >
            Recharger
          </button>
        </div>
      ) : null}

      <div>{children}</div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        {prevHref || onPrev ? (
          prevHref ? (
            <Link href={prevHref} className="text-text-secondary hover:text-text-primary text-sm">
              ← Précédent
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPrev}
              className="text-text-secondary hover:text-text-primary text-sm"
            >
              ← Précédent
            </button>
          )
        ) : (
          <span />
        )}
        {nextHref || onNext ? (
          nextHref ? (
            <Link
              href={nextHref}
              className="rounded-sm px-6 py-3 min-h-11 inline-flex items-center text-[15px] font-medium glass hover:[background:rgba(255,255,255,0.14)]"
            >
              {nextLabel ?? "Suivant →"}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="rounded-sm px-6 py-3 min-h-11 inline-flex items-center text-[15px] font-medium glass hover:[background:rgba(255,255,255,0.14)]"
            >
              {nextLabel ?? "Suivant →"}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
