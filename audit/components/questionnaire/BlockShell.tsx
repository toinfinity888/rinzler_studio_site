"use client";

import * as React from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/brand/GradientText";
import type { QuestionBlockPayload } from "@/lib/questionnaire/types";
import { hydrateSerializedSchema } from "@/lib/questionnaire/schema-builder";
import { trackEvent } from "@/lib/analytics/events";

import { FieldRenderer } from "./FieldRenderer";

export interface BlockShellProps {
  token: string;
  block: QuestionBlockPayload;
  initialValues: Record<string, unknown>;
  /**
   * Server action wrapper. Called after the hotelier "Continue"s; the
   * shell sends one `commitAnswer` per touched slug.
   */
  commitOne: (input: {
    question_slug: string;
    question_version_id: string;
    value: unknown;
    i_dont_know: boolean;
    voice_capture?: {
      transcript_post_edit: string;
      transcription_provider: "deepgram_eu" | "webspeech";
    } | null;
  }) => Promise<{ ok: boolean; reason?: string; completion_pct?: number }>;
  /**
   * Called when the shell has finished committing the current block and
   * the parent should fetch the next block.
   */
  onBlockComplete: () => void;
  /**
   * Called when the hotelier "submit"s on the LAST block.
   */
  onSubmitAudit?: () => Promise<void>;
  /** True when the block is the last in the flow. */
  isLastBlock?: boolean;
  /** Read-only mode (audit already submitted). */
  readOnly?: boolean;
}

export function BlockShell({
  token,
  block,
  initialValues,
  commitOne,
  onBlockComplete,
  onSubmitAudit,
  isLastBlock,
  readOnly,
}: BlockShellProps) {
  const [values, setValues] = React.useState<Record<string, unknown>>(initialValues);
  const [idkSet, setIdkSet] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const prefillIndex = React.useMemo(
    () => Object.fromEntries(block.prefilled.map((p) => [p.question_slug, p.source])),
    [block.prefilled],
  );

  React.useEffect(() => {
    setValues(initialValues);
    setIdkSet(new Set());
    setErrors({});
    trackEvent("audit_section_progressed", {
      block_id: block.block_id,
      block_index: block.block_progress.index,
    });
  }, [block.block_id, block.block_progress.index, initialValues]);

  const schema = React.useMemo(
    () => hydrateSerializedSchema(block.zod_schema_json),
    [block.zod_schema_json],
  );

  function onChange(slug: string, value: unknown) {
    setValues((prev) => ({ ...prev, [slug]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }

  function onToggleIdk(slug: string, next: boolean) {
    setIdkSet((prev) => {
      const ns = new Set(prev);
      if (next) ns.add(slug);
      else ns.delete(slug);
      return ns;
    });
    if (next) {
      setValues((prev) => ({ ...prev, [slug]: null }));
    }
  }

  async function handleContinue() {
    setSaving(true);
    setGlobalError(null);
    const localErrors: Record<string, string> = {};

    // Client-side validation pass (cheap fast-fail; server re-validates).
    for (const q of block.questions) {
      const v = values[q.slug];
      const idk = idkSet.has(q.slug);
      if (idk) continue;
      if (q.definition.required) {
        if (v === undefined || v === null || v === "") {
          localErrors[q.slug] = "Réponse requise (ou cocher « je ne sais pas »).";
          continue;
        }
      }
      try {
        // shape-check only — server has the canonical schema.
        const sub = schema.shape[q.slug];
        if (sub && v !== undefined && v !== null && v !== "") sub.parse(v);
      } catch (err) {
        localErrors[q.slug] = err instanceof Error ? err.message : "Réponse invalide.";
      }
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      setSaving(false);
      return;
    }

    // Commit each touched slug.
    for (const q of block.questions) {
      const idk = idkSet.has(q.slug);
      const v = idk ? null : values[q.slug];
      // Skip commits for untouched optional fields with no value (avoids
      // overwriting a prior answer with empty).
      if (
        !idk &&
        (v === undefined || v === null || v === "") &&
        !q.definition.required
      )
        continue;

      let voicePayload:
        | { transcript_post_edit: string; transcription_provider: "deepgram_eu" }
        | null = null;
      if (q.answer_type === "voice" && typeof v === "string" && v.length > 0) {
        voicePayload = {
          transcript_post_edit: v,
          transcription_provider: "deepgram_eu",
        };
      }
      const res = await commitOne({
        question_slug: q.slug,
        question_version_id: q.question_version_id,
        value: v ?? null,
        i_dont_know: idk,
        voice_capture: voicePayload,
      });
      if (!res.ok) {
        setGlobalError(res.reason ?? "Échec d’enregistrement.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    if (isLastBlock && onSubmitAudit) {
      await onSubmitAudit();
    } else {
      onBlockComplete();
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span>
            <GradientText>{block.block_title}</GradientText>
          </span>
        }
        description={`Section ${block.block_progress.index} / ${block.block_progress.total}`}
      />
      {block.language_fallback_used.length > 0 ? (
        <div className="mb-4 rounded-md p-3 text-xs [background:rgba(255,170,0,0.08)] [border:1px_solid_var(--color-warning)] text-warning">
          Certaines questions ne sont pas encore traduites — la version
          française est affichée par défaut.
        </div>
      ) : null}

      <div className="space-y-6">
        {block.questions.map((q) => (
          <FieldRenderer
            key={q.question_id}
            token={token}
            question={q}
            value={values[q.slug]}
            onChange={(v) => onChange(q.slug, v)}
            iDontKnow={idkSet.has(q.slug)}
            onToggleIdk={(n) => onToggleIdk(q.slug, n)}
            error={errors[q.slug] ?? null}
            readOnly={readOnly}
            prefilledFrom={prefillIndex[q.slug] ?? null}
          />
        ))}
      </div>

      {globalError ? (
        <p role="alert" className="mt-4 text-sm text-error">
          {globalError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-text-muted">
          Vos réponses sont sauvegardées au passage à la section suivante.
        </span>
        <Button onClick={handleContinue} disabled={readOnly || saving}>
          {saving
            ? "Enregistrement…"
            : isLastBlock
              ? "Soumettre l’audit →"
              : "Continuer →"}
        </Button>
      </div>
    </Card>
  );
}
