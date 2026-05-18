"use server";

import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { projects, submissions, answers, scores as scoresTable } from "@/db/schema";
import { hashToken } from "@/lib/tokens";
import { SECTIONS } from "@/lib/form-schema/sections";
import { buildZodSchema, validatePartial } from "@/lib/form-schema/validation";
import { computeCompletionPct } from "@/lib/form-schema/completion";
import { runAllScores } from "@/lib/scoring";
import { track } from "@/lib/analytics/plausible";

const SCHEMA = buildZodSchema(SECTIONS);

/* Per-token rate limiter (R5): max 30 calls / minute / token. */
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(tokenHash: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(tokenHash);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(tokenHash, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT;
}

export type SaveAnswersResult =
  | { ok: true; updatedAt: number; completionPct: number }
  | {
      ok: false;
      reason: "revoked" | "invalid" | "rate_limited" | "stale";
      invalid?: { fieldId: string; reason: string }[];
    };

export interface SaveAnswersInput {
  token: string;
  partial: Record<string, unknown>;
  expectedUpdatedAt?: number;
}

export async function saveAnswers(input: SaveAnswersInput): Promise<SaveAnswersResult> {
  const tokenHash = hashToken(input.token);
  if (!checkRateLimit(tokenHash)) return { ok: false, reason: "rate_limited" };

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, tokenHash))
    .limit(1);
  if (!project) return { ok: false, reason: "revoked" };
  if (project.tokenRevokedAt || project.status === "purged") {
    return { ok: false, reason: "revoked" };
  }

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);
  if (!submission) return { ok: false, reason: "revoked" };

  if (
    typeof input.expectedUpdatedAt === "number" &&
    new Date(submission.updatedAt).getTime() > input.expectedUpdatedAt
  ) {
    return { ok: false, reason: "stale" };
  }

  const { valid, invalid } = validatePartial(input.partial, SCHEMA);
  if (Object.keys(valid).length === 0) {
    return { ok: false, reason: "invalid", invalid };
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    for (const [fieldId, value] of Object.entries(valid)) {
      if (value === null) {
        await tx
          .delete(answers)
          .where(and(eq(answers.submissionId, submission.id), eq(answers.fieldId, fieldId)));
        continue;
      }
      const valueJson = JSON.stringify(value);
      // Upsert via MySQL's ON DUPLICATE KEY UPDATE (unique index on
      // (submission_id, field_id) is what triggers the conflict path).
      await tx
        .insert(answers)
        .values({
          id: randomUUID(),
          submissionId: submission.id,
          fieldId,
          valueJson,
          updatedAt: now,
          source: "client",
        })
        .onConflictDoUpdate({
          target: [answers.submissionId, answers.fieldId],
          set: { valueJson, updatedAt: now, source: "client" },
        });
    }

    // Recompute completion %.
    const allRows = await tx
      .select({ fieldId: answers.fieldId, valueJson: answers.valueJson })
      .from(answers)
      .where(eq(answers.submissionId, submission.id));
    const map: Record<string, unknown> = {};
    for (const r of allRows) {
      try {
        map[r.fieldId] = JSON.parse(r.valueJson);
      } catch {
        map[r.fieldId] = r.valueJson;
      }
    }
    const pct = computeCompletionPct(map, SECTIONS);
    await tx
      .update(submissions)
      .set({ updatedAt: now, completionPct: pct })
      .where(eq(submissions.id, submission.id));

    // Status transition: awaiting → in_progress on first client save.
    if (project.status === "awaiting" || project.status === "draft") {
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

  const [fresh] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submission.id))
    .limit(1);
  if (!fresh) return { ok: false, reason: "revoked" };

  if (fresh.completionPct >= 100) {
    track("audit_section_completed", { project_id: project.id, completion_pct: 100 });
  } else if (fresh.completionPct >= submission.completionPct + 12) {
    track("audit_section_completed", {
      project_id: project.id,
      completion_pct: fresh.completionPct,
    });
  }

  return {
    ok: true,
    updatedAt: new Date(fresh.updatedAt).getTime(),
    completionPct: fresh.completionPct,
  };
}

export type SubmitAuditResult =
  | { ok: true; submittedAt: number }
  | { ok: false; reason: "revoked" }
  | { ok: false; missingRequired: string[] };

export async function submitAudit(token: string): Promise<SubmitAuditResult> {
  const tokenHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, tokenHash))
    .limit(1);
  if (!project || project.tokenRevokedAt || project.status === "purged") {
    return { ok: false, reason: "revoked" };
  }
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.projectId, project.id))
    .limit(1);
  if (!submission) return { ok: false, reason: "revoked" };

  const allRows = await db
    .select({ fieldId: answers.fieldId, valueJson: answers.valueJson })
    .from(answers)
    .where(eq(answers.submissionId, submission.id));
  const map: Record<string, unknown> = {};
  for (const r of allRows) {
    try {
      map[r.fieldId] = JSON.parse(r.valueJson);
    } catch {
      map[r.fieldId] = r.valueJson;
    }
  }

  const missingRequired: string[] = [];
  for (const fid of SCHEMA.requiredFieldIds) {
    const v = map[fid];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) {
      missingRequired.push(fid);
    }
  }
  if (missingRequired.length > 0) {
    return { ok: false, missingRequired };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    const setOnSubmit: Record<string, unknown> = {
      status: "submitted",
      lastEditedAt: now,
    };
    if (!project.submittedAt) setOnSubmit.submittedAt = now;
    await tx.update(projects).set(setOnSubmit).where(eq(projects.id, project.id));

    const computed = runAllScores(map);
    await tx.delete(scoresTable).where(eq(scoresTable.submissionId, submission.id));
    for (const s of computed) {
      await tx.insert(scoresTable).values({
        id: randomUUID(),
        submissionId: submission.id,
        name: s.name,
        value: s.value,
        band: s.band,
        basisJson: JSON.stringify(s.basis),
        computedAt: now,
      });
    }
  });

  track("audit_submitted", { project_id: project.id });
  return { ok: true, submittedAt: now.getTime() };
}
