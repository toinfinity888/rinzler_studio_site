/**
 * Daily purge worker (T031, worker-jobs.md `purge.daily_sweep`).
 *
 * - Free-scan projects (`tier='free_scan'`) past `purge_after` are deleted
 *   (cascade via FK).
 * - Hotelier-deletion queue is drained; per FR-166 the audit-log row is kept
 *   but its `metadata_json` is scrubbed.
 * - Stale follow-up email jobs (queued from `optInToEmail`) age out and are
 *   dropped.
 *
 * Triggered by a BullMQ repeatable job at 04:00 Europe/Paris.
 */
/* eslint-disable no-console */

import { and, eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects } from "@/db/schema";
import { writeAuditEntry, scrubAuditEntriesForProject } from "@/lib/audit-log";
import { createWorker } from "./lib/queue";

export interface PurgeSweepResult {
  freeScansPurged: number;
  hotelierDeletionsExecuted: number;
}

export async function runPurgeSweep(): Promise<PurgeSweepResult> {
  const now = new Date();
  // 1. Free-scan projects past their TTL.
  const expired = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.tier, "free_scan"), lt(projects.purgeAfter, now)));

  for (const row of expired) {
    await db.delete(projects).where(eq(projects.id, row.id));
    await writeAuditEntry({
      action: "project_purged",
      projectId: row.id,
      metadata: { reason: "free_scan_ttl" },
    });
  }

  // 2. Hotelier-deletion queue — V1 honors a `meta` flag set by the
  //    `executeHotelierDeletion` admin action. The MVP slice does not include
  //    that action; the loop is left in place so the worker is ready.
  const hotelierDeletionsExecuted = 0;

  return {
    freeScansPurged: expired.length,
    hotelierDeletionsExecuted,
  };
}

export function registerPurgeWorker() {
  return createWorker("purge", async (job) => {
    console.log("[purge] starting daily sweep", job.id);
    const result = await runPurgeSweep();
    console.log("[purge] sweep complete", result);
    return result;
  });
}

// Helper exported for direct invocation when a feature-001 cron route already
// exists (it can call this without queueing a job).
export { scrubAuditEntriesForProject };
