/**
 * Scan worker (T038, worker-jobs.md `scan.run`).
 *
 * Drives one `scan.run` job per BullMQ message. The worker concurrency cap of
 * 4 is owned by `workers/lib/queue.ts`. Each job is bounded by the scanner's
 * own internal timeouts.
 *
 * Idempotency: keyed on `scan_id`. The scan-runner deletes prior findings for
 * the same `scan_id` before re-inserting, so retries are safe.
 */
import { createWorker, getQueue, type QueueName } from "./lib/queue";
import { runScan } from "@/lib/scanner/scan-runner";

export interface ScanRunJob {
  scan_id: string;
  url: string;
  canonical_url: string;
  project_id: string;
}

export const SCAN_QUEUE: QueueName = "scan";

export async function enqueueScanRun(job: ScanRunJob): Promise<string> {
  const queue = getQueue<ScanRunJob>(SCAN_QUEUE);
  const enqueued = await queue.add("scan.run", job, {
    // BullMQ disallows ":" in custom job IDs (it's a reserved key delimiter).
    jobId: `scan-run-${job.scan_id}`,
  });
  return String(enqueued.id);
}

export function registerScanWorker() {
  return createWorker<ScanRunJob>(SCAN_QUEUE, async (job) => {
    const { scan_id, url } = job.data;
    console.log(`[scan] starting ${scan_id} -> ${url}`);
    try {
      const result = await runScan(scan_id, url);
      console.log(`[scan] finished ${scan_id} status=${result.status} error_class=${result.errorClass ?? "-"} findings=${result.findingsInserted}`);
      return result;
    } catch (err) {
      console.error(`[scan] THREW ${scan_id}:`, err);
      throw err;
    }
  });
}
