import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDbClient } from "../lib/db/client";
import path from "node:path";

async function main() {
  const { db, pool } = createDbClient();
  const migrationsFolder = path.join(process.cwd(), "db", "migrations");
  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate]", err);
  process.exit(1);
});
