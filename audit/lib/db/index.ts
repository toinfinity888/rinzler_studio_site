import "server-only";
import type { Pool } from "mysql2/promise";
import { createDbClient, type Db } from "./client";

declare global {
  // eslint-disable-next-line no-var
  var __auditDb: Db | undefined;
  // eslint-disable-next-line no-var
  var __auditPool: Pool | undefined;
}

let dbInstance: Db;
let poolInstance: Pool;

if (globalThis.__auditDb && globalThis.__auditPool) {
  dbInstance = globalThis.__auditDb;
  poolInstance = globalThis.__auditPool;
} else {
  const created = createDbClient();
  dbInstance = created.db;
  poolInstance = created.pool;
  if (process.env.NODE_ENV !== "production") {
    globalThis.__auditDb = dbInstance;
    globalThis.__auditPool = poolInstance;
  }
  // Opportunistic on-startup purge backup (FR-044b). Runs once per worker,
  // no-op if last sweep was within 24h. Errors are swallowed so a misconfig
  // never blocks request handling.
  if (process.env.NODE_ENV === "production") {
    queueMicrotask(() => {
      void (async () => {
        try {
          const { isPurgeSweepDue, runPurgeSweep } = await import("@/lib/purge/sweep");
          if (await isPurgeSweepDue()) await runPurgeSweep();
        } catch {
          /* swallow — cron endpoint is the primary trigger */
        }
      })();
    });
  }
}

export const db = dbInstance;
export const pool = poolInstance;
export { schema } from "./client";
export type { Db, DbSchema } from "./client";
