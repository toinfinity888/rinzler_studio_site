/**
 * BullMQ workers entrypoint.
 *
 * Each `register*` function constructs its worker against the shared Redis
 * connection. Concurrency caps are owned per queue (see worker-jobs.md and
 * workers/lib/queue.ts).
 *
 * Run from the repo root via `npm run --prefix audit workers:dev` (uses tsx).
 */
/* eslint-disable no-console */

import { registerPurgeWorker } from "./purge.worker";
import { registerScanWorker } from "./scan.worker";

async function main() {
  console.log("[workers] starting…");
  const workers = [registerPurgeWorker(), registerScanWorker()];

  const shutdown = async (signal: string) => {
    console.log(`[workers] received ${signal}, draining in-flight jobs…`);
    await Promise.all(workers.map((w) => w.close()));
    console.log("[workers] shutdown complete.");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  console.log(`[workers] registered ${workers.length} workers.`);
}

main().catch((err) => {
  console.error("[workers] fatal:", err);
  process.exit(1);
});
