"use client";

import * as React from "react";
import { useTransition } from "react";

import { Textarea, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { applyConsultantOverride } from "@/lib/consultant/override";

/**
 * `OverrideControl` (T091) — UI for a single answer override.
 *
 * Shows the client's original value alongside an editable override input and
 * a justification textarea. On submit, calls `applyConsultantOverride`
 * server action. The original is NEVER mutated client-side; the action
 * writes a new `answers` row with `source = 'consultant_override'` and
 * `overrides_answer_id` pointing back at the original (FR-072 / FR-073).
 *
 * The textarea is required — overrides without a documented reason would
 * undermine the FR-072 audit trail. Validation surfaces the server error.
 */
export interface OverrideControlProps {
  projectId: string;
  questionSlug: string;
  questionPrompt: string;
  /** The original (client) value, stringified for display. */
  originalValueDisplay: string;
  /** The current effective value (post any prior overrides), stringified. */
  effectiveValueDisplay: string;
  /** Whether an override is already in place for this slug. */
  hasOverride: boolean;
}

export function OverrideControl({
  projectId,
  questionSlug,
  questionPrompt,
  originalValueDisplay,
  effectiveValueDisplay,
  hasOverride,
}: OverrideControlProps) {
  const [open, setOpen] = React.useState(false);
  const [override, setOverride] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSuccess(null);
    if (!override.trim()) {
      setError("La valeur d'override est obligatoire.");
      return;
    }
    if (!reason.trim()) {
      setError("Une justification est obligatoire (jamais visible par le client).");
      return;
    }
    if (reason.trim().length > 5000) {
      setError("La justification dépasse 5 000 caractères.");
      return;
    }
    startTransition(async () => {
      const result = await applyConsultantOverride({
        projectId,
        questionSlug,
        overrideValue: override.trim(),
        reason: reason.trim(),
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSuccess(
        result.recomputeEnqueued
          ? "Override enregistré. Re-calcul en cours…"
          : "Override enregistré (re-calcul à reprendre manuellement).",
      );
      setOverride("");
      setReason("");
      // Stay open so the consultant can see the success state; the page
      // RSC tree refreshes via revalidatePath.
    });
  }

  return (
    <div className="rounded-md p-4 [background:var(--color-bg-tertiary)] [border:1px_solid_var(--color-bg-secondary)]">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-text-primary font-medium">{questionPrompt}</p>
          <p className="text-xs text-text-muted font-mono mt-0.5">{questionSlug}</p>
        </div>
        {hasOverride ? (
          <span className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-wider text-warning [background:rgba(255,179,71,0.12)]">
            override actif
          </span>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-text-muted uppercase tracking-wider">
            Réponse client (originale)
          </dt>
          <dd className="mt-1 text-text-secondary whitespace-pre-wrap break-words">
            {originalValueDisplay || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted uppercase tracking-wider">
            Valeur effective
          </dt>
          <dd className="mt-1 text-text-primary whitespace-pre-wrap break-words">
            {effectiveValueDisplay || "—"}
          </dd>
        </div>
      </dl>

      {!open ? (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Override cette réponse
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <label className="block text-xs text-text-muted">
            Nouvelle valeur (consultant)
            <Input
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              placeholder="Saisir la valeur révisée"
              className="mt-1"
            />
          </label>
          <label className="block text-xs text-text-muted">
            Justification privée (jamais exposée au client)
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={5000}
              placeholder="Pourquoi cette correction ? (consigné dans l'audit log et les notes internes)"
              className="mt-1"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setOverride("");
                setReason("");
                setError(null);
                setSuccess(null);
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? "Application…" : "Appliquer l'override"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}
          {success ? (
            <p role="status" className="text-xs text-success">
              {success}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
