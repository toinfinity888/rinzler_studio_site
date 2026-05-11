"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SectionRenderer } from "@/components/form/SectionRenderer";
import { FormShell } from "./FormShell";
import { useAutosave } from "@/lib/client-form/autosave";
import { saveAnswers, submitAudit } from "@/app/(client)/a/[token]/actions";
import { SECTIONS } from "@/lib/form-schema/sections";
import { sectionTitle } from "@/lib/form-schema/i18n";

export interface ClientFormStepProps {
  token: string;
  sectionId: string;
  initialAnswers: Record<string, unknown>;
  initialUpdatedAt: number;
  initialCompletionPct: number;
}

export function ClientFormStep({
  token,
  sectionId,
  initialAnswers,
  initialUpdatedAt,
  initialCompletionPct,
}: ClientFormStepProps) {
  const router = useRouter();
  const sectionIndex = SECTIONS.findIndex((s) => s.id === sectionId);
  const section = SECTIONS[sectionIndex];

  const [values, setValues] = React.useState<Record<string, unknown>>(initialAnswers);
  const [missingRequired, setMissingRequired] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const autosave = useAutosave({
    token,
    initialUpdatedAt,
    save: (partial, expectedUpdatedAt) =>
      saveAnswers({ token, partial, expectedUpdatedAt }),
  });

  const onChange = React.useCallback(
    (fieldId: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      autosave.enqueue({ [fieldId]: value });
    },
    [autosave],
  );

  if (!section) {
    return (
      <p className="text-text-secondary">
        Section inconnue. <a href={`/a/${token}/form/s1`}>Revenir au début</a>
      </p>
    );
  }

  const isLast = sectionIndex === SECTIONS.length - 1;
  const prevHref = sectionIndex > 0 ? `/a/${token}/form/${SECTIONS[sectionIndex - 1]!.id}` : null;
  const nextHref = !isLast ? `/a/${token}/form/${SECTIONS[sectionIndex + 1]!.id}` : null;

  async function goNext() {
    setSubmitError(null);
    await autosave.flushNow();
    if (nextHref) {
      router.push(nextHref);
    } else {
      // Final submit
      setSubmitting(true);
      try {
        const result = await submitAudit(token);
        if (result.ok) {
          router.push(`/a/${token}/confirmation`);
        } else if ("missingRequired" in result) {
          setMissingRequired(result.missingRequired);
          // Bounce to s1 if any required field is missing — they're all in Section 1.
          router.push(`/a/${token}/form/s1`);
        } else {
          setSubmitError("Ce lien n'est plus actif.");
        }
      } finally {
        setSubmitting(false);
      }
    }
  }

  // Build a per-field error map for missing required fields.
  const errors: Record<string, string> = {};
  for (const fid of missingRequired) errors[fid] = "Champ obligatoire";

  return (
    <FormShell
      token={token}
      sectionIndex={sectionIndex + 1}
      totalSections={SECTIONS.length}
      completionPct={autosave.completionPct ?? initialCompletionPct}
      saveState={autosave.state}
      staleConflict={autosave.staleConflict}
      onReloadOnStale={() => {
        autosave.resetStaleConflict();
        router.refresh();
      }}
      prevHref={prevHref}
      onNext={goNext}
      nextLabel={
        submitting
          ? "Envoi…"
          : isLast
            ? "Soumettre l'audit"
            : `Section suivante : ${sectionTitle(SECTIONS[sectionIndex + 1]!.id)} →`
      }
    >
      <SectionRenderer
        section={section}
        values={values}
        onChange={onChange}
        errors={errors}
      />
      {submitError ? (
        <p role="alert" className="mt-4 text-sm text-error">
          {submitError}
        </p>
      ) : null}
    </FormShell>
  );
}
