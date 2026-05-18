import { defineConfig } from "drizzle-kit";

// Postgres 16 — per feature 003 plan.md and data-model.md.
// The pre-003 MySQL config is replaced by this Postgres config; the migration
// path is handled by `scripts/migrate-mysql-to-postgres.ts`.
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
