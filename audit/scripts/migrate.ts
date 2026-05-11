import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDbClient } from "../lib/db/client";
import path from "node:path";

const { db, sqlite } = createDbClient();
const migrationsFolder = path.join(process.cwd(), "db", "migrations");
console.log(`[migrate] applying migrations from ${migrationsFolder}`);
migrate(db, { migrationsFolder });
sqlite.close();
console.log("[migrate] done");
