"use client";

import type { AutosaveState } from "@/lib/client-form/autosave";

const LABELS: Record<AutosaveState, string> = {
  idle: "Modifié",
  saving: "Enregistrement…",
  saved: "Enregistré",
  offline: "Hors ligne — nouvelle tentative",
};

const COLORS: Record<AutosaveState, string> = {
  idle: "text-text-muted",
  saving: "text-accent-cyan",
  saved: "text-success",
  offline: "text-warning",
};

export function AutosaveIndicator({ state }: { state: AutosaveState }) {
  return (
    <span className={["text-xs inline-flex items-center gap-1.5", COLORS[state]].join(" ")}>
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          state === "saving"
            ? "bg-accent-cyan animate-pulse"
            : state === "saved"
              ? "bg-success"
              : state === "offline"
                ? "bg-warning"
                : "bg-text-muted",
        ].join(" ")}
      />
      {LABELS[state]}
    </span>
  );
}
