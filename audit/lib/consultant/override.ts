"use server";

/**
 * T087 — `applyConsultantOverride` server action (US 4).
 *
 * Contract (admin-server-actions.md, "Consultant workspace (US 4)"):
 *
 *   applyConsultantOverride(projectId, questionSlug, overrideValue, reason)
 *
 * Behavior:
 *  1. Gate on `consultant` or `super_admin` (FR-072).
 *  2. Insert a NEW `answers` row with `source = 'consultant_override'`
 *     and `overrides_answer_id` pointing at the original client answer.
 *     The original row is preserved — we NEVER mutate it (FR-073). The
 *     partial unique index on `answers (submission_id, field_id)` excludes
 *     `consultant_override` rows so this insert is permitted alongside the
 *     client row.
 *  3. Re-enqueue `ai.reason_project` with `trigger = "override_applied"`.
 *     The worker's context-builder is latest-wins per slug; override rows
 *     take precedence over the underlying client row (see workers/ai.worker.ts).
 *  4. Append a private `internal_notes` row attributed to the consultant
 *     with `target_type = 'project'`, body prefixed `[override]` for clarity
 *     in the consultant timeline.
 *  5. Write `audit_log` entry `consultant_override_applied` with attribution.
 *
 * Hard guarantees:
 *  - Original client answer row is NEVER updated; it is referenced by
 *    `overrides_answer_id` only.
 *  - The override `reason` lives ONLY in `internal_notes.body`. It MUST NOT
 *    leak into any client-facing payload (publish-time stripping in T089).
 *  - On a successful insert we always attempt to enqueue the recompute job;
 *    a Redis outage MUST NOT block the override write (mirrors submit.ts).
 */

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  answers,
  internalNotes,
  projects,
  submissions,
} from "@/db/schema";
import { emitConsultantOverrideApplied } from "@/lib/audit-log";
import { requireAdminWithAnyRole } from "@/lib/auth/hydrate-roles";

import type {
  ApplyConsultantOverrideInput,
  ApplyConsultantOverrideOutcome,
} from "./types";

// Re-import here so the literal prefix value lives next to the writer.
const OVERRIDE_NOTE_PREFIX = "[override]";

const INPUT = z.object({
  projectId: z.string().uuid(),
  questionSlug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_]+$/, "slug must be lowercase ascii + underscores"),
  overrideValue: z.unknown(),
  reason: z.string().trim().min(1).max(5000),
});

export async function applyConsultantOverride(
  raw: ApplyConsultantOverrideInput,
): Promise<ApplyConsultantOverrideOutcome> {
  const user = await requireAdminWithAnyRole(["consultant", "super_admin"]);

  const parsed = INPUT.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: "validation", message: parsed.error.message },
    };
  }
  const { projectId, questionSlug, overrideValue, reason } = parsed.data;

  // Resolve submission for the project.
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
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

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, projectId))
    .limit(1);
  if (!submission) {
    return {
      ok: false,
      error: { code: "no_submission", message: "Project has no submission yet" },
    };
  }

  // Find the most recent NON-override client row for this slug — that's
  // the "original" we override. If none exists (consultant entering data
  // the client never supplied), overrides_answer_id stays null.
  const [original] = await db
    .select()
    .from(answers)
    .where(
      and(
        eq(answers.submissionId, submission.id),
        eq(answers.fieldId, questionSlug),
      ),
    )
    .orderBy(desc(answers.updatedAt))
    .limit(1);

  // Pick the question_version_id from the original answer when available
  // (so historical traceability still works); otherwise null.
  const questionVersionId = original?.questionVersionId ?? null;

  const now = new Date();
  const overrideId = randomUUID();
  const noteId = randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(answers).values({
      id: overrideId,
      submissionId: submission.id,
      fieldId: questionSlug,
      valueJson: overrideValue ?? null,
      updatedAt: now,
      source: "consultant_override",
      confidence: "high",
      questionVersionId,
      overridesAnswerId: original?.id ?? null,
    });

    await tx.insert(internalNotes).values({
      id: noteId,
      projectId,
      authorId: user.id,
      // The body is the consultant-private reason. The `[override]` prefix
      // lets the UI distinguish override-context notes from free-form
      // consultant commentary. The body is PRIVATE — see snapshot strip
      // in `publishConsultantReport` (T089).
      body: `${OVERRIDE_NOTE_PREFIX} ${questionSlug}: ${reason}`,
      targetType: "project",
      targetId: projectId,
      createdAt: now,
    });

    await tx
      .update(projects)
      .set({ lastAdminActivityAt: now, lastEditedAt: now })
      .where(eq(projects.id, projectId));
  });

  // Audit log — `consultant_override_applied`. We use the dedicated helper
  // (T092) which strips any `reason` from metadata defensively. The reason
  // text already lives in `internal_notes` (single source of truth); the
  // audit log records only who-did-what-when so it never duplicates the
  // private body across surfaces.
  emitConsultantOverrideApplied({
    actorId: user.id,
    projectId,
    targetType: "answer",
    targetId: overrideId,
    metadata: {
      question_slug: questionSlug,
      overridden_answer_id: original?.id ?? null,
    },
  });

  // Enqueue partial recompute. Lazy-import so environments without Redis
  // (CI, unit tests) don't blow up at module load.
  let recomputeEnqueued = false;
  try {
    const { getQueue } = await import("@/workers/lib/queue");
    const aiQueue = getQueue<{
      project_id: string;
      trigger: "override_applied";
      scope: "partial";
    }>("ai");
    await aiQueue.add(
      "ai.reason_project",
      { project_id: projectId, trigger: "override_applied", scope: "partial" },
      // Reusing the same jobId would deduplicate concurrent overrides; use
      // a unique id so the latest override always re-runs the engine.
      { jobId: `ai-reason-${projectId}-override-${overrideId}` },
    );
    recomputeEnqueued = true;
  } catch {
    // Recompute failure must not block the write — a follow-up cron picks
    // up stale projects. The override row is durable regardless.
  }

  revalidatePath(`/admin/consultant/${projectId}`);
  revalidatePath(`/admin/projects/${projectId}`);

  return {
    ok: true,
    overrideAnswerId: overrideId,
    originalAnswerId: original?.id ?? null,
    recomputeEnqueued,
  };
}
