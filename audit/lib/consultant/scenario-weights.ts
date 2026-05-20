"use server";

/**
 * T088 — `adjustScenarioWeights` server action (US 4).
 *
 * Contract (admin-server-actions.md):
 *
 *   adjustScenarioWeights(projectId, scenarioId, weightAdjustments)
 *
 * The consultant tweaks the next published snapshot for ONE engagement
 * without rewriting the rules engine. Persisted in
 * `scenario_weight_overrides`; the AI worker reads them when it rebuilds
 * the snapshot (see workers/ai.worker.ts post-engine step).
 *
 * Hard guarantees:
 *  - `consultant` or `super_admin` role required.
 *  - Justification (`reason`) is consultant-private. The action ALSO writes
 *    a single combined internal note so the project timeline shows the
 *    consultant's rationale alongside other override commentary. The
 *    `reason` text never enters a snapshot (verified by T093).
 *  - Recompute is enqueued so the next snapshot reflects the adjustments.
 *  - Audit-log entry `consultant_override_applied` (same enum value as
 *    answer overrides — both are consultant-level engagement tweaks).
 */

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  internalNotes,
  projects,
  scenarioWeightOverrides,
  SCENARIO_WEIGHT_ADJUSTMENTS,
  type ScenarioWeightAdjustment,
} from "@/db/schema";
import { emitConsultantOverrideApplied } from "@/lib/audit-log";
import { requireAdminWithAnyRole } from "@/lib/auth/hydrate-roles";

import type {
  AdjustScenarioWeightsInput,
  AdjustScenarioWeightsOutcome,
} from "./types";

const SCENARIO_NOTE_PREFIX = "[scenario-weight]";

const ADJUSTMENT = z.object({
  adjustment: z.enum(SCENARIO_WEIGHT_ADJUSTMENTS),
  scenarioId: z.string().uuid().optional().nullable(),
  recommendationId: z.string().uuid().optional().nullable(),
  weightDelta: z.number().int().min(-100).max(100).optional().nullable(),
  reason: z.string().trim().max(2000).optional().nullable(),
});

const INPUT = z.object({
  projectId: z.string().uuid(),
  scenarioId: z.string().uuid().optional().nullable(),
  adjustments: z.array(ADJUSTMENT).min(1).max(50),
});

export async function adjustScenarioWeights(
  raw: AdjustScenarioWeightsInput,
): Promise<AdjustScenarioWeightsOutcome> {
  const user = await requireAdminWithAnyRole(["consultant", "super_admin"]);

  const parsed = INPUT.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "validation", message: parsed.error.message },
    };
  }
  const input = parsed.data;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) {
    return { ok: false, error: { code: "not_found", message: "Project not found" } };
  }
  if (project.status === "purged" || project.status === "archived") {
    return {
      ok: false,
      error: { code: "locked", message: `Project is ${project.status}` },
    };
  }

  const now = new Date();
  const insertedIds: string[] = [];
  const noteLines: string[] = [];

  await db.transaction(async (tx) => {
    for (const a of input.adjustments) {
      const id = randomUUID();
      insertedIds.push(id);
      await tx.insert(scenarioWeightOverrides).values({
        id,
        projectId: input.projectId,
        scenarioId: a.scenarioId ?? input.scenarioId ?? null,
        recommendationId: a.recommendationId ?? null,
        adjustment: a.adjustment as ScenarioWeightAdjustment,
        weightDelta: a.weightDelta ?? null,
        reason: a.reason ?? null,
        authorId: user.id,
        createdAt: now,
      });
      // Compose a human-readable summary line that goes into ONE consolidated
      // internal note. Per-line summary keeps the project timeline readable.
      const target =
        a.recommendationId ?? a.scenarioId ?? input.scenarioId ?? "project";
      const reasonSummary = a.reason ? ` — ${a.reason}` : "";
      noteLines.push(
        `${a.adjustment}(delta=${a.weightDelta ?? 0}) → ${target}${reasonSummary}`,
      );
    }

    if (noteLines.length > 0) {
      await tx.insert(internalNotes).values({
        id: randomUUID(),
        projectId: input.projectId,
        authorId: user.id,
        body: `${SCENARIO_NOTE_PREFIX} ${noteLines.join("\n")}`,
        targetType: "project",
        targetId: input.projectId,
        createdAt: now,
      });
    }

    await tx
      .update(projects)
      .set({ lastAdminActivityAt: now, lastEditedAt: now })
      .where(eq(projects.id, input.projectId));
  });

  emitConsultantOverrideApplied({
    actorId: user.id,
    projectId: input.projectId,
    targetType: "scenario_weights",
    targetId: insertedIds[0] ?? input.projectId,
    metadata: {
      count: insertedIds.length,
      scenario_id: input.scenarioId ?? null,
      // We log the adjustment KINDS but not the consultant's free-text
      // reason (which lives privately in internal_notes).
      kinds: input.adjustments.map((a) => a.adjustment),
    },
  });

  let recomputeEnqueued = false;
  try {
    const { getQueue } = await import("@/workers/lib/queue");
    const aiQueue = getQueue<{
      project_id: string;
      trigger: "consultant_recompute";
      scope: "partial";
    }>("ai");
    await aiQueue.add(
      "ai.reason_project",
      {
        project_id: input.projectId,
        trigger: "consultant_recompute",
        scope: "partial",
      },
      { jobId: `ai-reason-${input.projectId}-weights-${insertedIds[0] ?? randomUUID()}` },
    );
    recomputeEnqueued = true;
  } catch {
    // Same fall-through as override.ts — durable write, async recompute.
  }

  revalidatePath(`/admin/consultant/${input.projectId}`);

  return { ok: true, insertedIds, recomputeEnqueued };
}
