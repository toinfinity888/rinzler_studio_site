import "server-only";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, answers, readinessScores, internalNotes, submissions, meta } from "@/db/schema";
import { writeAuditEntry } from "@/lib/audit-log";

const THIRTY_SIX_MONTHS_MS = 36 * 30 * 24 * 60 * 60 * 1000; // ≈ 1080 days

export interface PurgeOptions {
  now?: Date;
  dryRun?: boolean;
}

export interface PurgeResult {
  purged: number;
  skipped: number;
  cutoffIso: string;
}

/**
 * 36-month auto-purge sweep (FR-044b, R11).
 * Marks the project status `purged`, deletes its answers/scores/notes/submission
 * (CASCADE handles most of this), keeps the project row as a tombstone with
 * label + dates only, writes an audit_log entry per purge, and updates
 * meta.last_purge_sweep_at.
 */
export async function runPurgeSweep(opts: PurgeOptions = {}): Promise<PurgeResult> {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() - THIRTY_SIX_MONTHS_MS);

  const candidates = await db
    .select()
    .from(projects)
    .where(
      and(lt(projects.lastAdminActivityAt, cutoff), eq(projects.ongoingEngagement, false)),
    );

  let purged = 0;
  let skipped = 0;

  for (const p of candidates) {
    if (p.status === "purged") {
      skipped += 1;
      continue;
    }
    if (opts.dryRun) {
      purged += 1;
      continue;
    }

    await db.transaction(async (tx) => {
      const [sub] = await tx
        .select()
        .from(submissions)
        .where(eq(submissions.projectId, p.id))
        .limit(1);
      // Cascade scores by projectId (new readinessScores shape — feature 003).
      await tx.delete(readinessScores).where(eq(readinessScores.projectId, p.id));
      if (sub) {
        await tx.delete(answers).where(eq(answers.submissionId, sub.id));
        await tx.delete(submissions).where(eq(submissions.id, sub.id));
      }
      await tx.delete(internalNotes).where(eq(internalNotes.projectId, p.id));
      await tx
        .update(projects)
        .set({
          status: "purged",
          hotelName: null,
          contactEmail: "purged@purged.local",
          tokenRevokedAt: now,
        })
        .where(eq(projects.id, p.id));
    });

    writeAuditEntry({
      action: "project.purge",
      projectId: p.id,
      metadata: { cutoff: cutoff.toISOString(), reason: "36_month_inactivity" },
    });
    purged += 1;
  }

  if (!opts.dryRun) {
    await db
      .insert(meta)
      .values({ key: "last_purge_sweep_at", value: now.toISOString() })
      .onConflictDoUpdate({
        target: meta.key,
        set: { value: now.toISOString(), updatedAt: now },
      });
  }

  return { purged, skipped, cutoffIso: cutoff.toISOString() };
}

/** True if the last sweep was more than 24 hours ago (or never). */
export async function isPurgeSweepDue(now: Date = new Date()): Promise<boolean> {
  const [row] = await db.select().from(meta).where(eq(meta.key, "last_purge_sweep_at")).limit(1);
  if (!row) return true;
  const last = new Date(row.value).getTime();
  return now.getTime() - last >= 24 * 60 * 60 * 1000;
}
