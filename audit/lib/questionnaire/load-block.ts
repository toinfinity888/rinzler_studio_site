/**
 * Block loader (T053 helper).
 *
 * Given a project + a target block, resolve:
 *  - the visible `RenderableQuestion[]` (after evaluating conditions and
 *    filtering by tier + hotel-type),
 *  - the canonical language for each + whether the fallback was used (FR-104),
 *  - the next block to render after the current one (`null` if complete).
 *
 * Postgres jsonb columns arrive already-parsed. Do NOT JSON.parse them.
 */
import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  questions as questionsT,
  questionVersions,
  questionTranslations,
  questionConditions,
  type Question,
  type QuestionVersion,
} from "@/db/schema";
import { QUESTION_BLOCKS, type QuestionBlock } from "@/db/schema";

import { evaluateAnyCondition, type ConditionContext } from "./condition-evaluator";
import type {
  QuestionDefinition,
  QuestionOption,
  RenderableQuestion,
} from "./types";

const CANONICAL_LANGUAGE = "fr";

/* ------------------------------------------------------------------ */
/* Block order                                                        */
/* ------------------------------------------------------------------ */

/**
 * The default block order. Matches the 22-block flow in spec §22; the seed
 * script can register fewer blocks. We surface a block to the renderer iff
 * at least one published question targets that block.
 */
export const BLOCK_ORDER: readonly QuestionBlock[] = QUESTION_BLOCKS;

export function nextBlock(current: QuestionBlock | null): QuestionBlock | null {
  if (current === null) return BLOCK_ORDER[0] ?? null;
  const idx = BLOCK_ORDER.indexOf(current);
  if (idx < 0) return BLOCK_ORDER[0] ?? null;
  return BLOCK_ORDER[idx + 1] ?? null;
}

/* ------------------------------------------------------------------ */
/* Load questions in a block                                          */
/* ------------------------------------------------------------------ */

export interface LoadBlockArgs {
  block: QuestionBlock;
  tier: string;
  hotelType: string | null;
  language: string;
  ctx: ConditionContext;
}

export interface LoadedBlock {
  block: QuestionBlock;
  questions: RenderableQuestion[];
  /** True iff at least one question's translation fell back. */
  anyFallback: boolean;
}

/**
 * Build a `RenderableQuestion` from raw rows. The translation map MUST be
 * keyed by `(question_version_id, language)`.
 */
function hydrate(
  q: Question,
  v: QuestionVersion,
  translation: { prompt: string; helper: string | null; optionLabels: unknown } | null,
  languageUsed: string,
  fallbackUsed: boolean,
): RenderableQuestion {
  const def = (v.definitionJson as QuestionDefinition | null) ?? {};
  const optionSlugs = def.options ?? [];
  const optionLabels =
    (translation?.optionLabels as Record<string, string> | null) ?? {};
  const options: QuestionOption[] = optionSlugs.map((slug) => ({
    slug,
    label: optionLabels[slug] ?? slug,
  }));
  return {
    question_id: q.id,
    question_version_id: v.id,
    slug: q.slug,
    block: q.block,
    answer_type: q.answerType,
    prompt: translation?.prompt ?? q.slug,
    helper: translation?.helper ?? null,
    definition: def,
    options,
    language_used: languageUsed,
    fallback_language_used: fallbackUsed,
  };
}

/**
 * Load the canonical version + the requested language's translation (with
 * canonical-FR fallback) + the conditions list for a block of questions.
 */
export async function loadBlock(args: LoadBlockArgs): Promise<LoadedBlock> {
  // 1. Pull all published questions for this block, tier, and hotel type.
  const allInBlock = await db
    .select()
    .from(questionsT)
    .where(and(eq(questionsT.block, args.block), eq(questionsT.status, "published")));

  const eligible = allInBlock.filter((q) => {
    if (!q.auditLevels.includes(args.tier)) return false;
    if (q.hotelTypes && q.hotelTypes.length > 0) {
      if (!args.hotelType || !q.hotelTypes.includes(args.hotelType)) return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return { block: args.block, questions: [], anyFallback: false };
  }

  // 2. Load the current `question_versions` row for each.
  const versionRows = await db
    .select()
    .from(questionVersions)
    .where(
      inArray(
        questionVersions.questionId,
        eligible.map((q) => q.id),
      ),
    );

  // Pick the active version per question (matches `questions.currentVersion`).
  const activeByQid = new Map<string, QuestionVersion>();
  for (const q of eligible) {
    const v = versionRows.find(
      (vr) => vr.questionId === q.id && vr.version === q.currentVersion,
    );
    if (v) activeByQid.set(q.id, v);
  }

  if (activeByQid.size === 0) {
    return { block: args.block, questions: [], anyFallback: false };
  }

  const activeVersionIds = Array.from(activeByQid.values()).map((v) => v.id);

  // 3. Load translations for the requested language AND canonical.
  const translationRows = await db
    .select()
    .from(questionTranslations)
    .where(inArray(questionTranslations.questionVersionId, activeVersionIds));

  const byVersion: Record<string, typeof translationRows> = {};
  for (const tr of translationRows) {
    const key = tr.questionVersionId;
    if (!byVersion[key]) byVersion[key] = [];
    byVersion[key].push(tr);
  }

  // 4. Load conditions for each version.
  const conditionRows = await db
    .select()
    .from(questionConditions)
    .where(inArray(questionConditions.questionVersionId, activeVersionIds));

  const conditionsByVersion: Record<string, unknown[]> = {};
  for (const c of conditionRows) {
    const key = c.questionVersionId;
    if (!conditionsByVersion[key]) conditionsByVersion[key] = [];
    // jsonb passthrough
    conditionsByVersion[key].push(c.expressionJson);
  }

  // 5. Hydrate + evaluate conditions.
  let anyFallback = false;
  const renderable: RenderableQuestion[] = [];

  for (const q of eligible) {
    const v = activeByQid.get(q.id);
    if (!v) continue;
    const versionTranslations = byVersion[v.id] ?? [];
    const wanted = versionTranslations.find((t) => t.language === args.language);
    const fallback = versionTranslations.find((t) => t.language === CANONICAL_LANGUAGE);
    let translation: typeof versionTranslations[number] | null = null;
    let languageUsed = args.language;
    let fallbackUsed = false;
    if (wanted) {
      translation = wanted;
    } else if (fallback) {
      translation = fallback;
      languageUsed = CANONICAL_LANGUAGE;
      fallbackUsed = true;
      anyFallback = true;
    }
    const hydrated = hydrate(
      q,
      v,
      translation
        ? {
            prompt: translation.prompt,
            helper: translation.helper,
            optionLabels: translation.optionLabels,
          }
        : null,
      languageUsed,
      fallbackUsed,
    );
    const conds = conditionsByVersion[v.id];
    // Conditions are OR-ed at the row level. Empty list = always show.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const show = evaluateAnyCondition(conds as any, args.ctx);
    if (!show) continue;
    renderable.push(hydrated);
  }

  return { block: args.block, questions: renderable, anyFallback };
}

/**
 * Find the next block (in declared order) that has at least one visible
 * question for this project's context. Skips blocks where every question
 * is conditioned-out. Returns `null` when the audit is complete.
 */
export async function findNextRenderableBlock(args: {
  startAfter: QuestionBlock | null;
  tier: string;
  hotelType: string | null;
  language: string;
  ctx: ConditionContext;
}): Promise<LoadedBlock | null> {
  let cursor: QuestionBlock | null = nextBlock(args.startAfter);
  while (cursor !== null) {
    const loaded = await loadBlock({
      block: cursor,
      tier: args.tier,
      hotelType: args.hotelType,
      language: args.language,
      ctx: args.ctx,
    });
    if (loaded.questions.length > 0) {
      return loaded;
    }
    cursor = nextBlock(cursor);
  }
  return null;
}
