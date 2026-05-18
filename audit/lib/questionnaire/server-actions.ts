"use server";

/**
 * T053 — Questionnaire server actions.
 *
 * Exposes the four contract endpoints from
 * `specs/003-hotel-diagnostic-platform/contracts/client-server-actions.md`:
 *
 *  - getProjectContext(token)
 *  - getNextQuestionBlock(token, currentBlock?)
 *  - commitAnswer(token, payload)         → defined in ./commit.ts
 *  - submitAudit(token)                   → defined in ./submit.ts
 *  - getReportStatus(token)               → defined in ./submit.ts
 *
 * All routes use the existing tokenized-client auth pattern from
 * feature 001 (`projects.token_hash`). Postgres jsonb is already-parsed
 * (don't JSON.parse it).
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  projects,
  hotels,
  submissions,
  answers,
  scans,
  scanFindings,
  type Project,
  type Hotel,
} from "@/db/schema";
import { hashToken, verifyToken } from "@/lib/tokens";

import { findNextRenderableBlock, BLOCK_ORDER } from "./load-block";
import { buildBlockSchema } from "./schema-builder";
import { computePrefills } from "./prefill";
import type {
  QuestionBlockPayload,
  RenderableQuestion,
} from "./types";
import type { QuestionBlock } from "@/db/schema";

/* ------------------------------------------------------------------ */
/* Shared loader                                                      */
/* ------------------------------------------------------------------ */

export interface LoadedProjectContext {
  project: Project;
  hotel: Hotel | null;
  submissionId: string;
  answersByslug: Record<string, unknown>;
  scanFindings: Record<string, unknown>;
  scanId: string | null;
}

async function loadProjectContextInternal(
  plaintextToken: string,
): Promise<LoadedProjectContext | null> {
  const candidateHash = hashToken(plaintextToken);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, candidateHash))
    .limit(1);
  if (!project || !project.tokenHash) return null;
  if (project.tokenRevokedAt) return null;
  if (project.status === "purged") return null;
  if (!verifyToken(plaintextToken, project.tokenHash)) return null;

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);
  if (!submission) return null;

  const [hotel] = project.hotelId
    ? await db.select().from(hotels).where(eq(hotels.id, project.hotelId)).limit(1)
    : [null];

  // Existing answers, keyed by field_id (which is the question slug per
  // data-model.md §D: "`field_id` becomes `question_slug` semantically").
  const answerRows = await db
    .select({ fieldId: answers.fieldId, valueJson: answers.valueJson })
    .from(answers)
    .where(eq(answers.submissionId, submission.id));
  const answersByslug: Record<string, unknown> = {};
  for (const r of answerRows) {
    answersByslug[r.fieldId] = r.valueJson;
  }

  // Scan findings — only the most recent succeeded scan attached to this
  // project. NULL out cleanly if no scan exists yet (mini/full tiers without
  // a leading scan are valid).
  const scanFindingMap: Record<string, unknown> = {};
  let scanId: string | null = null;
  const [scan] = await db
    .select()
    .from(scans)
    .where(eq(scans.projectId, project.id))
    .limit(1);
  if (scan && scan.status === "succeeded") {
    scanId = scan.id;
    const findings = await db
      .select()
      .from(scanFindings)
      .where(eq(scanFindings.scanId, scan.id));
    for (const f of findings) {
      scanFindingMap[f.field] = f.valueJson;
    }
  }

  return {
    project,
    hotel: hotel ?? null,
    submissionId: submission.id,
    answersByslug,
    scanFindings: scanFindingMap,
    scanId,
  };
}

/* ------------------------------------------------------------------ */
/* getProjectContext                                                  */
/* ------------------------------------------------------------------ */

export interface ProjectContextResult {
  ok: true;
  project: {
    id: string;
    hotel_id: string | null;
    tier: string;
    status: string;
    goal_primary: string | null;
    goal_secondary: string[] | null;
    budget_level: string | null;
    completion_pct: number;
    language: string;
    can_edit: boolean;
    scan_id_or_null: string | null;
  };
  hotel: {
    id: string;
    display_name: string | null;
    country: string | null;
    property_type: string | null;
    star_rating: number | null;
    room_count: number | null;
    primary_language: string;
  } | null;
  scan_findings: { field: string; value: unknown }[];
  current_block: QuestionBlock | null;
  blocks_total: number;
}

export type ProjectContextResponse =
  | ProjectContextResult
  | { ok: false; reason: "revoked" };

export async function getProjectContext(
  token: string,
): Promise<ProjectContextResponse> {
  const loaded = await loadProjectContextInternal(token);
  if (!loaded) return { ok: false, reason: "revoked" };

  const { project, hotel, submissionId, scanFindings, scanId } = loaded;

  // Completion pct lookup
  const [submissionRow] = await db
    .select({ completionPct: submissions.completionPct })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  const canEdit =
    project.status !== "submitted" &&
    project.status !== "published" &&
    project.status !== "archived" &&
    project.status !== "purged" &&
    !project.tokenRevokedAt;

  return {
    ok: true,
    project: {
      id: project.id,
      hotel_id: project.hotelId,
      tier: project.tier,
      status: project.status,
      goal_primary: project.goalPrimary,
      goal_secondary: project.goalSecondary,
      budget_level: project.budgetLevel,
      completion_pct: submissionRow?.completionPct ?? 0,
      language: hotel?.primaryLanguage ?? "fr",
      can_edit: canEdit,
      scan_id_or_null: scanId,
    },
    hotel: hotel
      ? {
          id: hotel.id,
          display_name: hotel.displayName,
          country: hotel.country,
          property_type: hotel.propertyType,
          star_rating: hotel.starRating,
          room_count: hotel.roomCount,
          primary_language: hotel.primaryLanguage,
        }
      : null,
    scan_findings: Object.entries(scanFindings).map(([field, value]) => ({
      field,
      value,
    })),
    current_block: BLOCK_ORDER[0] ?? null,
    blocks_total: BLOCK_ORDER.length,
  };
}

/* ------------------------------------------------------------------ */
/* getNextQuestionBlock                                               */
/* ------------------------------------------------------------------ */

export type NextBlockResponse =
  | {
      ok: true;
      done: false;
      block: QuestionBlockPayload;
    }
  | { ok: true; done: true }
  | { ok: false; reason: "revoked" | "locked" };

export async function getNextQuestionBlock(
  token: string,
  startAfter: QuestionBlock | null = null,
): Promise<NextBlockResponse> {
  const loaded = await loadProjectContextInternal(token);
  if (!loaded) return { ok: false, reason: "revoked" };

  if (
    loaded.project.status === "submitted" ||
    loaded.project.status === "published" ||
    loaded.project.status === "archived"
  ) {
    return { ok: false, reason: "locked" };
  }

  const language = loaded.hotel?.primaryLanguage ?? "fr";
  const block = await findNextRenderableBlock({
    startAfter,
    tier: loaded.project.tier,
    hotelType: loaded.hotel?.propertyType ?? null,
    language,
    ctx: {
      answers: loaded.answersByslug,
      scanFindings: loaded.scanFindings,
    },
  });

  if (!block) {
    return { ok: true, done: true };
  }

  const prefilled = computePrefills(block.questions, {
    scanFindings: loaded.scanFindings,
    existingAnswers: loaded.answersByslug,
    consultantPrefill: undefined,
  });

  const { serialized } = buildBlockSchema(block.questions);
  const idx = BLOCK_ORDER.indexOf(block.block);

  const languageFallbackUsed: { question_id: string }[] = block.questions
    .filter((q: RenderableQuestion) => q.fallback_language_used)
    .map((q) => ({ question_id: q.question_id }));

  return {
    ok: true,
    done: false,
    block: {
      block_id: block.block,
      block_title: blockTitle(block.block, language),
      block_progress: { index: idx + 1, total: BLOCK_ORDER.length },
      questions: block.questions,
      zod_schema_json: serialized,
      prefilled: prefilled.map((p) => ({
        question_slug: p.question_slug,
        source: p.source,
      })),
      language_fallback_used: languageFallbackUsed,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Block title helper                                                 */
/* ------------------------------------------------------------------ */

// Block titles are sourced from the spec §22 names. UI strings live here
// (the per-question prompts are DB-sourced; the block headings are
// product surface text — fine to keep in TS).
const BLOCK_TITLES_FR: Record<QuestionBlock, string> = {
  profile: "Profil de l'hôtel",
  goal: "Objectif principal",
  stack: "Outils actuels",
  website: "Site web et réservation directe",
  communication: "Communication avec les clients",
  operations: "Réception et opérations",
  knowledge_ai: "Base de connaissance et IA",
  reviews: "Avis et e-réputation",
  ai_visibility: "Visibilité IA",
  compliance: "Conformité et RGPD",
  budget: "Budget et appétence au changement",
  pms_deep: "PMS — questions approfondies",
  goal_branch: "Priorisation selon votre objectif",
  prioritization: "Priorisation finale",
};

const BLOCK_TITLES_EN: Record<QuestionBlock, string> = {
  profile: "Hotel profile",
  goal: "Primary goal",
  stack: "Current stack",
  website: "Website & direct booking",
  communication: "Guest communication",
  operations: "Reception & operations",
  knowledge_ai: "Knowledge base & AI",
  reviews: "Reviews & reputation",
  ai_visibility: "AI visibility",
  compliance: "Compliance & GDPR",
  budget: "Budget & change readiness",
  pms_deep: "PMS deep-dive",
  goal_branch: "Goal-based prioritization",
  prioritization: "Final prioritization",
};

function blockTitle(block: QuestionBlock, language: string): string {
  if (language === "en") return BLOCK_TITLES_EN[block] ?? block;
  return BLOCK_TITLES_FR[block] ?? block;
}

/* Re-exports for the route layer. */
export { loadProjectContextInternal };
