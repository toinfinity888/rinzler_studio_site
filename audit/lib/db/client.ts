import mysql, { type Pool } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "@/db/schema";

export type DbSchema = typeof schema;
export type Db = MySql2Database<DbSchema>;

/**
 * Build a Drizzle MySQL client backed by `mysql2/promise` connection pool.
 *
 * Connection URL format:
 *   mysql://<user>:<password>@<host>:<port>/<database>?ssl=...
 * On o2switch the typical value is:
 *   mysql://muma6351_audit:<password>@localhost:3306/muma6351_audit
 * (cPanel prefixes DB users / databases with `<cpanel-user>_`.)
 */
export function createDbClient(): { db: Db; pool: Pool } {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // mysql2 returns DECIMAL as string by default; we don't use DECIMAL but
    // we DO want JSON column casting if it ever lands. Booleans are tinyint(1)
    // and convert automatically.
    timezone: "Z",
  });
  const db = drizzle(pool, { schema, mode: "default" });
  return { db, pool };
}

export { schema };
