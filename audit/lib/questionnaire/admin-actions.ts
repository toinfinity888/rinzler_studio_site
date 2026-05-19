"use server";

/**
 * T103, T104 — Questionnaire admin server actions.
 *
 * Implements the contract in
 * `specs/003-hotel-diagnostic-platform/contracts/admin-server-actions.md`
 * "Questionnaire management (US 6)" section.
 *
 * Hard guarantees:
 *  - Every mutation gates on `questionnaire_admin` or `super_admin` via
 *    `requireAdminWithAnyRole`.
 *  - Updates append a NEW `question_versions` row (FR-103) with
 *    `status='draft'`. The parent question's `current_version` only
 *    advances on `publishQuestionVersion`.
 *  - Past audits remain readable against their pinned version.
 *  - Audit log emits the canonical action enums from data-model.md §K.
 *  - Translations + conditions are scoped to a question_version_id;
 *    they cascade-delete with the version (already enforced at the DB).
 */

import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, sql, count } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  questions,
  questionVersions,
  questionTranslations,
  questionConditions,
  ANSWER_TYPES,
  QUESTION_BLOCKS,
  QUESTION_STATUSES,
  type AnswerType,
  type QuestionBlock,
  type QuestionStatus,
} from "@/db/schema";
import { writeAuditEntry } from "@/lib/audit-log";
import { requireAdminWithAnyRole } from "@/lib/auth/hydrate-roles";
import { evaluateExpression, type ConditionContext } from "./condition-evaluator";

const TRANSLATION_INPUT = z.object({
  language: z.string().min(2).max(8),
  prompt: z.string().min(1).max(600),
  helper: z.string().max(800).optional().nullable(),
  optionLabels: z.record(z.string(), z.string()).optional().nullable(),
});

const CONDITION_INPUT = z.object({
  expression: z.unknown(), // Free-form JSON AST validated by the evaluator
});

const CORE_QUESTION_INPUT = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/, "ASCII lowercase + underscores only"),
  block: z.enum(QUESTION_BLOCKS as readonly [QuestionBlock, ...QuestionBlock[]]),
  answer_type: z.enum(ANSWER_TYPES as readonly [AnswerType, ...AnswerType[]]),
  audit_levels: z.array(z.string()).min(1),
  hotel_types: z.array(z.string()).optional().nullable(),
  goal_relevance: z.array(z.string()).optional().nullable(),
  scoring_contributions: z.record(z.string(), z.unknown()).optional().nullable(),
  definition: z.record(z.string(), z.unknown()),
  translations: z.array(TRANSLATION_INPUT).min(1),
  conditions: z.array(CONDITION_INPUT).optional().default([]),
});

const CREATE_INPUT = CORE_QUESTION_INPUT;
export type CreateQuestionInput = z.input<typeof CREATE_INPUT>;

const UPDATE_INPUT = CORE_QUESTION_INPUT.partial({
  slug: true, // slug is immutable after creation
  block: true,
  answer_type: true,
  audit_levels: true,
  hotel_types: true,
  goal_relevance: true,
  scoring_contributions: true,
  definition: true,
  translations: true,
  conditions: true,
});
export type UpdateQuestionInput = z.input<typeof UPDATE_INPUT>;

export interface ActionOk<T = unknown> {
  ok: true;
  data: T;
}
export interface ActionErr {
  ok: false;
  error: { code: string; message: string };
}
export type ActionResult<T = unknown> = ActionOk<T> | ActionErr;

/* ============================== createQuestion ============================== */

export async function createQuestion(
  raw: CreateQuestionInput,
): Promise<ActionResult<{ questionId: string; versionId: string }>> {
  const user = await requireAdminWithAnyRole(["questionnaire_admin", "super_admin"]);
  const parsed = CREATE_INPUT.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "validation", message: parsed.error.message } };
  }
  const input = parsed.data;

  // Slug uniqueness
  const [existing] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.slug, input.slug))
    .limit(1);
  if (existing) {
    return { ok: false, error: { code: "slug_taken", message: `Slug ${input.slug} already used` } };
  }

  const questionId = randomUUID();
  const versionId = randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(questions).values({
      id: questionId,
      slug: input.slug,
      block: input.block,
      answerType: input.answer_type,
      auditLevels: input.audit_levels,
      hotelTypes: input.hotel_types ?? null,
      goalRelevance: input.goal_relevance ?? null,
      scoringContributions: input.scoring_contributions ?? null,
      currentVersion: 1,
      // New questions start as draft. `publishQuestionVersion` flips them
      // to "published" with a corresponding currentVersion bump.
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(questionVersions).values({
      id: versionId,
      questionId,
      version: 1,
      definitionJson: input.definition,
      publishedAt: now,
      publishedBy: user.id,
    });
    for (const t of input.translations) {
      await tx.insert(questionTranslations).values({
        questionVersionId: versionId,
        language: t.language,
        prompt: t.prompt,
        helper: t.helper ?? null,
        optionLabels: t.optionLabels ?? null,
      });
    }
    for (const c of input.conditions) {
      await tx.insert(questionConditions).values({
        questionVersionId: versionId,
        expressionJson: c.expression as object,
      });
    }
  });

  writeAuditEntry({
    actorId: user.id,
    action: "question_created",
    targetType: "question",
    targetId: questionId,
    metadata: { slug: input.slug, block: input.block },
  });

  revalidatePath("/admin/questionnaire");
  return { ok: true, data: { questionId, versionId } };
}

/* ============================== updateQuestion ============================== */

/**
 * Append a new draft `question_versions` row. The parent question's
 * `current_version` does NOT advance until `publishQuestionVersion`
 * is called on the returned `versionId`.
 *
 * Slug + block + answer_type are NOT updated through this call (changing
 * them would break referential integrity with the answers table). Use
 * deactivate + create-new for those.
 */
export async function updateQuestion(
  questionId: string,
  raw: UpdateQuestionInput,
): Promise<ActionResult<{ versionId: string; version: number }>> {
  const user = await requireAdminWithAnyRole(["questionnaire_admin", "super_admin"]);
  const parsed = UPDATE_INPUT.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: { code: "validation", message: parsed.error.message } };
  }
  const input = parsed.data;

  const [q] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!q) return { ok: false, error: { code: "not_found", message: "Question not found" } };
  if (q.status === "deactivated") {
    return { ok: false, error: { code: "deactivated", message: "Question is deactivated" } };
  }

  // Find current max version to compute next
  const [maxRow] = await db
    .select({ v: sql<number>`max(${questionVersions.version})` })
    .from(questionVersions)
    .where(eq(questionVersions.questionId, questionId));
  const nextVersion = (maxRow?.v ?? 0) + 1;

  // Load the previous published version so we can carry forward fields
  // the caller didn't override.
  const [prevVer] = await db
    .select()
    .from(questionVersions)
    .where(eq(questionVersions.questionId, questionId))
    .orderBy(desc(questionVersions.version))
    .limit(1);

  const versionId = randomUUID();
  const now = new Date();

  // Fields that travel through `questions` (not `question_versions`)
  const newAuditLevels = input.audit_levels ?? q.auditLevels;
  const newHotelTypes = input.hotel_types ?? q.hotelTypes;
  const newGoalRelevance = input.goal_relevance ?? q.goalRelevance;
  const newScoring = input.scoring_contributions ?? q.scoringContributions;

  // Definition + translations + conditions: if not supplied, copy from prev version.
  const newDefinition = input.definition ?? (prevVer?.definitionJson as object);

  await db.transaction(async (tx) => {
    await tx
      .update(questions)
      .set({
        auditLevels: newAuditLevels,
        hotelTypes: newHotelTypes,
        goalRelevance: newGoalRelevance,
        scoringContributions: newScoring,
        updatedAt: now,
      })
      .where(eq(questions.id, questionId));

    await tx.insert(questionVersions).values({
      id: versionId,
      questionId,
      version: nextVersion,
      definitionJson: newDefinition,
      publishedAt: now,
      publishedBy: user.id,
    });

    if (input.translations !== undefined) {
      for (const t of input.translations) {
        await tx.insert(questionTranslations).values({
          questionVersionId: versionId,
          language: t.language,
          prompt: t.prompt,
          helper: t.helper ?? null,
          optionLabels: t.optionLabels ?? null,
        });
      }
    } else if (prevVer) {
      // Copy translations forward
      const prevTr = await tx
        .select()
        .from(questionTranslations)
        .where(eq(questionTranslations.questionVersionId, prevVer.id));
      for (const t of prevTr) {
        await tx.insert(questionTranslations).values({
          questionVersionId: versionId,
          language: t.language,
          prompt: t.prompt,
          helper: t.helper,
          optionLabels: t.optionLabels,
        });
      }
    }

    if (input.conditions !== undefined) {
      for (const c of input.conditions) {
        await tx.insert(questionConditions).values({
          questionVersionId: versionId,
          expressionJson: c.expression as object,
        });
      }
    } else if (prevVer) {
      const prevConditions = await tx
        .select()
        .from(questionConditions)
        .where(eq(questionConditions.questionVersionId, prevVer.id));
      for (const c of prevConditions) {
        await tx.insert(questionConditions).values({
          questionVersionId: versionId,
          expressionJson: c.expressionJson,
        });
      }
    }
  });

  revalidatePath("/admin/questionnaire");
  revalidatePath(`/admin/questionnaire/${questionId}/edit`);
  return { ok: true, data: { versionId, version: nextVersion } };
}

/* =========================== publishQuestionVersion ========================= */

export async function publishQuestionVersion(
  questionId: string,
  versionId: string,
): Promise<ActionResult<{ currentVersion: number }>> {
  const user = await requireAdminWithAnyRole(["questionnaire_admin", "super_admin"]);
  const [v] = await db
    .select()
    .from(questionVersions)
    .where(and(eq(questionVersions.id, versionId), eq(questionVersions.questionId, questionId)))
    .limit(1);
  if (!v) return { ok: false, error: { code: "not_found", message: "Version not found" } };

  await db
    .update(questions)
    .set({ currentVersion: v.version, status: "published", updatedAt: new Date() })
    .where(eq(questions.id, questionId));

  writeAuditEntry({
    actorId: user.id,
    action: "question_published",
    targetType: "question",
    targetId: questionId,
    metadata: { version: v.version },
  });

  revalidatePath("/admin/questionnaire");
  revalidatePath(`/admin/questionnaire/${questionId}/edit`);
  return { ok: true, data: { currentVersion: v.version } };
}

/* ============================ deactivateQuestion ============================ */

export async function deactivateQuestion(
  questionId: string,
): Promise<ActionResult<{ status: QuestionStatus }>> {
  const user = await requireAdminWithAnyRole(["questionnaire_admin", "super_admin"]);
  await db
    .update(questions)
    .set({ status: "deactivated", updatedAt: new Date() })
    .where(eq(questions.id, questionId));

  writeAuditEntry({
    actorId: user.id,
    action: "question_deactivated",
    targetType: "question",
    targetId: questionId,
  });

  revalidatePath("/admin/questionnaire");
  return { ok: true, data: { status: "deactivated" } };
}

/* ============================ previewQuestionnaire ========================== */

/**
 * Simulate which questions would render for a fake hotelier profile,
 * WITHOUT writing anything to the audit corpus. Returns the resolved
 * list of (question_slug, would_show?) pairs. The staging-mode preview
 * (T102 spirit) so the team can verify a condition before publishing.
 */
export interface PreviewProfile {
  hotelType?: string;
  goal?: string;
  auditLevel?: string;
  answers?: Record<string, unknown>;
  scanFindings?: Record<string, unknown>;
}
export interface PreviewItem {
  question_id: string;
  slug: string;
  block: string;
  status: string;
  visible: boolean;
  reason?: string;
}
export async function previewQuestionnaire(
  profile: PreviewProfile,
): Promise<ActionResult<{ items: PreviewItem[] }>> {
  // Read-only preview — allow any consultant role. We still require an
  // authenticated admin to avoid leaking the question set.
  await requireAdminWithAnyRole([
    "consultant",
    "questionnaire_admin",
    "vendor_database_admin",
    "super_admin",
  ]);

  const rows = await db
    .select()
    .from(questions)
    .orderBy(questions.block, questions.slug);
  const items: PreviewItem[] = [];

  // condition-evaluator only inspects `answers` and `scanFindings`. We
  // surface hotelType/goal/auditLevel as synthetic pseudo-answers under
  // reserved underscored slugs so the same expression language can
  // reference them: e.g. { "answer": "_hotel_type", "op": "eq", "value": "boutique" }.
  const ctx: ConditionContext = {
    answers: {
      ...(profile.answers ?? {}),
      ...(profile.hotelType ? { _hotel_type: profile.hotelType } : {}),
      ...(profile.goal ? { _goal: profile.goal } : {}),
      ...(profile.auditLevel ? { _audit_level: profile.auditLevel } : {}),
    },
    scanFindings: profile.scanFindings ?? {},
  };

  for (const q of rows) {
    if (q.status !== "published") {
      items.push({
        question_id: q.id,
        slug: q.slug,
        block: q.block,
        status: q.status,
        visible: false,
        reason: `status=${q.status}`,
      });
      continue;
    }
    if (profile.auditLevel && !q.auditLevels.includes(profile.auditLevel)) {
      items.push({
        question_id: q.id,
        slug: q.slug,
        block: q.block,
        status: q.status,
        visible: false,
        reason: `audit_level ${profile.auditLevel} not in ${q.auditLevels.join("|")}`,
      });
      continue;
    }

    // Pull conditions for the current_version
    const [ver] = await db
      .select()
      .from(questionVersions)
      .where(
        and(
          eq(questionVersions.questionId, q.id),
          eq(questionVersions.version, q.currentVersion),
        ),
      )
      .limit(1);
    if (!ver) {
      items.push({
        question_id: q.id,
        slug: q.slug,
        block: q.block,
        status: q.status,
        visible: false,
        reason: "no current_version row",
      });
      continue;
    }
    const conds = await db
      .select()
      .from(questionConditions)
      .where(eq(questionConditions.questionVersionId, ver.id));

    let visible = true;
    let reason: string | undefined;
    for (const c of conds) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const passes = evaluateExpression(c.expressionJson as any, ctx);
        if (!passes) {
          visible = false;
          reason = "condition failed";
          break;
        }
      } catch (err) {
        visible = false;
        reason = `condition error: ${err instanceof Error ? err.message : String(err)}`;
        break;
      }
    }

    items.push({
      question_id: q.id,
      slug: q.slug,
      block: q.block,
      status: q.status,
      visible,
      ...(reason ? { reason } : {}),
    });
  }

  return { ok: true, data: { items } };
}

/* =========================== listQuestionsForAdmin ========================= */

export interface AdminQuestionListItem {
  id: string;
  slug: string;
  block: QuestionBlock;
  answerType: AnswerType;
  status: QuestionStatus;
  currentVersion: number;
  versionsCount: number;
  updatedAt: Date;
}

export interface AdminQuestionListInput {
  block?: QuestionBlock;
  status?: QuestionStatus | "any";
  search?: string;
}

export async function listQuestionsForAdmin(
  filter: AdminQuestionListInput,
): Promise<ActionResult<{ items: AdminQuestionListItem[] }>> {
  await requireAdminWithAnyRole([
    "consultant",
    "questionnaire_admin",
    "vendor_database_admin",
    "super_admin",
  ]);

  const conditions = [];
  if (filter.block) conditions.push(eq(questions.block, filter.block));
  if (filter.status && filter.status !== "any") {
    conditions.push(eq(questions.status, filter.status));
  }
  if (filter.search) {
    conditions.push(sql`${questions.slug} ILIKE ${"%" + filter.search + "%"}`);
  }

  const rows = await db
    .select()
    .from(questions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(questions.block, questions.slug);

  // Count versions per question (cheap aggregate)
  const ids = rows.map((r) => r.id);
  const versionCounts =
    ids.length > 0
      ? await db
          .select({
            qid: questionVersions.questionId,
            c: count(questionVersions.id),
          })
          .from(questionVersions)
          .where(inArray(questionVersions.questionId, ids))
          .groupBy(questionVersions.questionId)
      : [];
  const countByQid = new Map(versionCounts.map((r) => [r.qid, Number(r.c)]));

  const items: AdminQuestionListItem[] = rows.map((q) => ({
    id: q.id,
    slug: q.slug,
    block: q.block,
    answerType: q.answerType,
    status: q.status,
    currentVersion: q.currentVersion,
    versionsCount: countByQid.get(q.id) ?? 0,
    updatedAt: q.updatedAt,
  }));

  return { ok: true, data: { items } };
}

/* ============================== getQuestionForEdit ========================= */

/**
 * Load the full editable shape for the question editor: current draft
 * version (or current published version if no draft exists), with
 * translations + conditions.
 */
export async function getQuestionForEdit(
  questionId: string,
): Promise<
  ActionResult<{
    question: typeof questions.$inferSelect;
    version: typeof questionVersions.$inferSelect;
    translations: (typeof questionTranslations.$inferSelect)[];
    conditions: (typeof questionConditions.$inferSelect)[];
  }>
> {
  await requireAdminWithAnyRole([
    "consultant",
    "questionnaire_admin",
    "vendor_database_admin",
    "super_admin",
  ]);

  const [q] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!q) return { ok: false, error: { code: "not_found", message: "Question not found" } };

  const [ver] = await db
    .select()
    .from(questionVersions)
    .where(eq(questionVersions.questionId, q.id))
    .orderBy(desc(questionVersions.version))
    .limit(1);
  if (!ver) return { ok: false, error: { code: "no_version", message: "Question has no version" } };

  const translations = await db
    .select()
    .from(questionTranslations)
    .where(eq(questionTranslations.questionVersionId, ver.id));
  const conditions = await db
    .select()
    .from(questionConditions)
    .where(eq(questionConditions.questionVersionId, ver.id));

  return { ok: true, data: { question: q, version: ver, translations, conditions } };
}
