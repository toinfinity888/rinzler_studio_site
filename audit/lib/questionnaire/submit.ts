"use server";

/**
 * T055 / T056 — `submitAudit` + `getReportStatus` server actions.
 *
 * Contract: client-server-actions.md.
 *
 * `submitAudit` enqueues the `ai_reason` worker and the
 * `enrichment.worker.ts` job, then marks the project `submitted`. The
 * report generation itself lives in US3 (T074); for US2 we only need the
 * status transition + the polling endpoint.
 *
 * `getReportStatus` exposes a coarse status the renderer polls. Until US3
 * lands, "ready" means the project is published; otherwise we report
 * `pending`. The progress-hint is a heuristic.
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects, reportSnapshots } from "@/db/schema";
import { hashToken, verifyToken } from "@/lib/tokens";
import { track } from "@/lib/analytics/plausible";

export type SubmitAuditResponse =
  | { ok: true; submitted_at: string }
  | { ok: false; reason: "revoked" | "already_submitted" };

export async function submitAudit(token: string): Promise<SubmitAuditResponse> {
  const candidateHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, candidateHash))
    .limit(1);
  if (!project || !project.tokenHash) return { ok: false, reason: "revoked" };
  if (project.tokenRevokedAt || project.status === "purged") {
    return { ok: false, reason: "revoked" };
  }
  if (!verifyToken(token, project.tokenHash)) return { ok: false, reason: "revoked" };

  if (project.status === "submitted" || project.status === "published") {
    return { ok: false, reason: "already_submitted" };
  }

  const now = new Date();
  await db
    .update(projects)
    .set({
      status: "submitted",
      submittedAt: project.submittedAt ?? now,
      lastEditedAt: now,
    })
    .where(eq(projects.id, project.id));

  // Enqueue ai.reason_project + enrichment jobs. We deliberately import the
  // queue helper lazily so that environments without Redis (e.g. CI for the
  // contract tests of US2 alone) don't fail at module load.
  try {
    const { getQueue } = await import("@/workers/lib/queue");
    const aiQueue = getQueue<{
      project_id: string;
      trigger: "audit_submitted";
      scope: "full";
    }>("ai");
    await aiQueue.add(
      "ai.reason_project",
      { project_id: project.id, trigger: "audit_submitted", scope: "full" },
      { jobId: `ai-reason-${project.id}` },
    );

    const enrichmentQueue = getQueue<{ project_id: string }>("enrichment");
    await enrichmentQueue.add(
      "enrichment.extract_from_audit",
      { project_id: project.id },
      { jobId: `enrich-${project.id}` },
    );
  } catch {
    // Queueing failure must not block the submit transition; the project
    // is still flagged "submitted" and a follow-up cron can pick it up.
  }

  track("audit_submitted", { project_id: project.id });

  return { ok: true, submitted_at: now.toISOString() };
}

export type ReportStatusResponse =
  | {
      ok: true;
      status: "pending" | "in_progress" | "ready" | "failed";
      progress_hint: number; // 0..1
      estimated_seconds_remaining: number;
    }
  | { ok: false; reason: "revoked" };

export async function getReportStatus(token: string): Promise<ReportStatusResponse> {
  const candidateHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, candidateHash))
    .limit(1);
  if (!project || !project.tokenHash) return { ok: false, reason: "revoked" };
  if (project.tokenRevokedAt || project.status === "purged") {
    return { ok: false, reason: "revoked" };
  }
  if (!verifyToken(token, project.tokenHash)) return { ok: false, reason: "revoked" };

  // If a report snapshot exists, we're ready.
  const [snapshot] = await db
    .select({ id: reportSnapshots.id })
    .from(reportSnapshots)
    .where(eq(reportSnapshots.projectId, project.id))
    .limit(1);
  if (snapshot) {
    return {
      ok: true,
      status: "ready",
      progress_hint: 1,
      estimated_seconds_remaining: 0,
    };
  }

  switch (project.status) {
    case "submitted":
      return {
        ok: true,
        status: "in_progress",
        progress_hint: 0.4,
        estimated_seconds_remaining: 60,
      };
    case "published":
    case "consultant_finalized":
      return {
        ok: true,
        status: "ready",
        progress_hint: 1,
        estimated_seconds_remaining: 0,
      };
    case "archived":
      return {
        ok: true,
        status: "failed",
        progress_hint: 0,
        estimated_seconds_remaining: 0,
      };
    default:
      return {
        ok: true,
        status: "pending",
        progress_hint: 0,
        estimated_seconds_remaining: 90,
      };
  }
}
