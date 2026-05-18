import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

export type DbSchema = typeof schema;
export type Db = NodePgDatabase<DbSchema>;

/**
 * Build a Drizzle Postgres client backed by `pg` connection pool.
 *
 * Connection URL format:
 *   postgres://<user>:<password>@<host>:<port>/<database>?sslmode=require
 *
 * Targets Clever Cloud Managed Postgres (FR) in production; local dev uses
 * the Docker compose stack in `audit/infra/dev/docker-compose.yml`.
 *
 * Replaces the prior MySQL driver per feature 003 (research.md R5) and the
 * Audit Sub-Stack's swap-permission in the constitution. Driver swap is
 * the documented T006 task.
 */
export function createDbClient(): { db: Db; pool: Pool } {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    application_name: "audit",
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export { schema };
