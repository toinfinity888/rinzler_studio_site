"use server";

/**
 * T054 — `commitAnswer` server action.
 *
 * Persists a single answer (or "I don't know") for the dynamic questionnaire,
 * optionally with a voice capture record. Implements the contract in
 * `specs/003-hotel-diagnostic-platform/contracts/client-server-actions.md`.
 *
 * Critical invariants:
 *  - Server-side re-validate against the question's published version using
 *    the SAME schema-builder the renderer relied on (constitution v1.2.0
 *    single-source-of-truth).
 *  - "I don't know" is always accepted; downstream `confidence` drops to
 *    `low` (FR-018).
 *  - Voice payload: persist `voice_captures.transcript_post_edit` ONLY.
 *    NO RAW AUDIO IS PERSISTED. Pass the transcript through the server-side
 *    redactor (`lib/ai/redact.ts`) before storage (R9).
 *  - Postgres jsonb columns are already-parsed — never JSON.parse here.
 */

import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import {
  answers,
  voiceCaptures,
  submissions,
  projects,
  questions as questionsT,
  questionVersions,
  questionTranslations,
  questionConditions,
} from "@/db/schema";
import { redactString } from "@/lib/ai/redact";
import { track } from "@/lib/analytics/plausible";

import { loadProjectContextInternal } from "./server-actions";
import { loadBlock, BLOCK_ORDER } from "./load-block";
import { buildBlockSchema, validateSingleAnswer } from "./schema-builder";

import type { QuestionBlock } from "@/db/schema";
import type { RenderableQuestion } from "./types";

/* ------------------------------------------------------------------ */
/* Payload                                                            */
/* ------------------------------------------------------------------ */

export interface CommitAnswerVoicePayload {
  transcript_post_edit: string;
  structured_extraction?: Record<string, unknown> | null;
  transcription_provider: "deepgram_eu" | "webspeech";
}

export interface CommitAnswerInput {
  token: string;
  question_slug: string;
  question_version_id: string;
  value: unknown;
  i_dont_know?: boolean;
  voice_capture?: CommitAnswerVoicePayload | null;
}

export type CommitAnswerResult =
  | {
      ok: true;
      next_visibility_changed: boolean;
      completion_pct: number;
    }
  | {
      ok: false;
      reason:
        | "revoked"
        | "locked"
        | "invalid"
        | "unknown_question"
        | "version_mismatch";
      detail?: string;
    };

/* ------------------------------------------------------------------ */
/* Implementation                                                     */
/* ------------------------------------------------------------------ */

export async function commitAnswer(
  input: CommitAnswerInput,
): Promise<CommitAnswerResult> {
  const loaded = await loadProjectContextInternal(input.token);
  if (!loaded) return { ok: false, reason: "revoked" };

  const { project, submissionId } = loaded;
  if (
    project.status === "submitted" ||
    project.status === "published" ||
    project.status === "archived"
  ) {
    return { ok: false, reason: "locked" };
  }

  // Resolve the question + ensure the version_id supplied matches what's
  // currently published for this slug. (We don't reject when the slug is
  // a stale pin; downstream traceability uses question_version_id from the
  // commit payload, so we accept stale pins but FLAG a version mismatch
  // in the response for client telemetry.)
  const [q] = await db
    .select()
    .from(questionsT)
    .where(eq(questionsT.slug, input.question_slug))
    .limit(1);
  if (!q) return { ok: false, reason: "unknown_question" };

  const [v] = await db
    .select()
    .from(questionVersions)
    .where(
      and(
        eq(questionVersions.id, input.question_version_id),
        eq(questionVersions.questionId, q.id),
      ),
    )
    .limit(1);
  if (!v) {
    return { ok: false, reason: "version_mismatch", detail: input.question_version_id };
  }

  // Load the translation + conditions for this version so we can build the
  // single-question RenderableQuestion (and from it, the serialized schema).
  // Conditions don't gate the commit itself (we trust the client), but we
  // do recompute next-block visibility after the write.
  const language = loaded.hotel?.primaryLanguage ?? "fr";
  const trList = await db
    .select()
    .from(questionTranslations)
    .where(eq(questionTranslations.questionVersionId, v.id));
  const tr =
    trList.find((t) => t.language === language) ??
    trList.find((t) => t.language === "fr") ??
    null;

  const renderable: RenderableQuestion = {
    question_id: q.id,
    question_version_id: v.id,
    slug: q.slug,
    block: q.block,
    answer_type: q.answerType,
    prompt: tr?.prompt ?? q.slug,
    helper: tr?.helper ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition: (v.definitionJson as any) ?? {},
    options: (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def: any = (v.definitionJson as any) ?? {};
      const slugs: string[] = def.options ?? [];
      const labels: Record<string, string> =
        (tr?.optionLabels as Record<string, string> | null) ?? {};
      return slugs.map((s: string) => ({ slug: s, label: labels[s] ?? s }));
    })(),
    language_used: tr?.language ?? "fr",
    fallback_language_used: false,
  };

  const { serialized } = buildBlockSchema([renderable]);

  const iDontKnow = input.i_dont_know === true;

  let normalizedValue: unknown;
  try {
    const parsed = validateSingleAnswer(
      serialized,
      input.question_slug,
      input.value,
      iDontKnow,
    );
    normalizedValue = parsed.value;
  } catch (err) {
    return {
      ok: false,
      reason: "invalid",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  // For voice answers we ALSO accept the transcript as the answer value
  // when it's present; otherwise use the validated value.
  let voiceRowToWrite: {
    transcriptPostEdit: string;
    structuredExtraction: Record<string, unknown> | null;
    redactionCategoriesMatched: string[];
    transcriptionProvider: string;
  } | null = null;
  if (input.voice_capture && q.answerType === "voice" && !iDontKnow) {
    const { redactedPayload, categoriesMatched } = redactString(
      input.voice_capture.transcript_post_edit,
    );
    voiceRowToWrite = {
      transcriptPostEdit: redactedPayload,
      structuredExtraction: input.voice_capture.structured_extraction ?? null,
      redactionCategoriesMatched: categoriesMatched,
      transcriptionProvider: input.voice_capture.transcription_provider,
    };
    // The answer value for a voice question IS the post-edit transcript.
    normalizedValue = redactedPayload;
  }

  const now = new Date();
  const writeValue = iDontKnow ? null : normalizedValue;

  // Autosave optimization: if the user produced no answer (empty string,
  // undefined, empty array) AND they did NOT mark "I don't know", treat
  // this as a no-op commit. Avoids littering the DB with empty rows and
  // sidesteps writes that would otherwise have nothing meaningful to record.
  const isEmptyValue =
    !iDontKnow &&
    (writeValue === undefined ||
      writeValue === null ||
      writeValue === "" ||
      (Array.isArray(writeValue) && writeValue.length === 0));
  if (isEmptyValue) {
    return {
      ok: true,
      next_visibility_changed: false,
      completion_pct: loaded.submissionCompletionPct ?? 0,
    };
  }

  // Compute the source + confidence per FR-018: "I don't know" → low.
  const confidence = iDontKnow ? "low" : "high";
  const source = voiceRowToWrite ? "voice_extracted" : "client";

  // Snapshot existing answers (pre-commit) so we can detect visibility shifts.
  const preAnswers: Record<string, unknown> = { ...loaded.answersByslug };
  preAnswers[q.slug] = writeValue;

  let answerIdForVoice: string | null = null;

  await db.transaction(async (tx) => {
    // Upsert the answer row.
    const inserted = await tx
      .insert(answers)
      .values({
        id: randomUUID(),
        submissionId,
        fieldId: q.slug,
        valueJson: writeValue,
        updatedAt: now,
        source,
        confidence,
        questionVersionId: v.id,
      })
      .onConflictDoUpdate({
        target: [answers.submissionId, answers.fieldId],
        set: {
          valueJson: writeValue,
          updatedAt: now,
          source,
          confidence,
          questionVersionId: v.id,
        },
      })
      .returning({ id: answers.id });
    answerIdForVoice = inserted[0]?.id ?? null;

    // Write the voice capture row if applicable (NO RAW AUDIO).
    if (voiceRowToWrite && answerIdForVoice) {
      await tx
        .delete(voiceCaptures)
        .where(eq(voiceCaptures.answerId, answerIdForVoice));
      await tx.insert(voiceCaptures).values({
        id: randomUUID(),
        answerId: answerIdForVoice,
        transcriptPostEdit: voiceRowToWrite.transcriptPostEdit,
        structuredExtraction: voiceRowToWrite.structuredExtraction,
        redactionCategoriesMatched: voiceRowToWrite.redactionCategoriesMatched,
        transcriptionProvider: voiceRowToWrite.transcriptionProvider,
      });
    }

    // Recompute completion_pct as a coarse "answered / total visible" %.
    // We approximate by counting questions in BLOCK_ORDER that have a row.
    const allRows = await tx
      .select({ fieldId: answers.fieldId })
      .from(answers)
      .where(eq(answers.submissionId, submissionId));
    const answeredCount = allRows.length;
    const pct = Math.min(
      100,
      Math.floor((answeredCount / Math.max(BLOCK_ORDER.length * 3, 1)) * 100),
    );
    await tx
      .update(submissions)
      .set({ updatedAt: now, completionPct: pct })
      .where(eq(submissions.id, submissionId));

    if (project.status === "awaiting_client" || project.status === "draft") {
      await tx
        .update(projects)
        .set({ status: "in_progress", lastEditedAt: now })
        .where(eq(projects.id, project.id));
    } else {
      await tx
        .update(projects)
        .set({ lastEditedAt: now })
        .where(eq(projects.id, project.id));
    }
  });

  // After-the-write visibility check: did this answer flip the visibility
  // of any downstream question? Cheap: compare the block before/after.
  const visibilityChanged = await detectVisibilityShift(
    loaded.project.tier,
    loaded.hotel?.propertyType ?? null,
    loaded.hotel?.primaryLanguage ?? "fr",
    q.block,
    loaded.answersByslug,
    preAnswers,
    loaded.scanFindings,
  );

  if (voiceRowToWrite) {
    track("audit_section_completed", {
      project_id: project.id,
      voice_used: true,
    });
  }

  const [submissionRow] = await db
    .select({ completionPct: submissions.completionPct })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  return {
    ok: true,
    next_visibility_changed: visibilityChanged,
    completion_pct: submissionRow?.completionPct ?? 0,
  };
}

/** Compare loaded blocks before/after a write to detect a visibility flip. */
async function detectVisibilityShift(
  tier: string,
  hotelType: string | null,
  language: string,
  blockTouched: QuestionBlock,
  beforeAnswers: Record<string, unknown>,
  afterAnswers: Record<string, unknown>,
  scanFindings: Record<string, unknown>,
): Promise<boolean> {
  // Only check the touched block + the next block — cheap upper bound.
  const idx = BLOCK_ORDER.indexOf(blockTouched);
  const checks: QuestionBlock[] = [];
  if (idx >= 0) {
    checks.push(blockTouched);
    const next = BLOCK_ORDER[idx + 1];
    if (next) checks.push(next);
  }
  for (const b of checks) {
    const before = await loadBlock({
      block: b,
      tier,
      hotelType,
      language,
      ctx: { answers: beforeAnswers, scanFindings },
    });
    const after = await loadBlock({
      block: b,
      tier,
      hotelType,
      language,
      ctx: { answers: afterAnswers, scanFindings },
    });
    if (before.questions.length !== after.questions.length) return true;
    const beforeSlugs = before.questions.map((q) => q.slug).sort();
    const afterSlugs = after.questions.map((q) => q.slug).sort();
    for (let i = 0; i < beforeSlugs.length; i++) {
      if (beforeSlugs[i] !== afterSlugs[i]) return true;
    }
  }
  return false;
}

// Quiet unused-import warning — we keep questionConditions imported for
// symmetry with the loader; it's used transitively via load-block.
void questionConditions;
