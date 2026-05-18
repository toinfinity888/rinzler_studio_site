/**
 * Union schema (Postgres). Re-exports every table from the per-domain modules
 * under `db/schema/*.ts`. Drizzle reads this single entrypoint, so the
 * application code does not need to know which file declares which table.
 *
 * Feature 003 (Hotel Diagnostic Platform) replaces the legacy MySQL single-
 * file schema. The data-migration script
 * (`scripts/migrate-mysql-to-postgres.ts`) handles the one-shot cutover; this
 * file is the source of truth from that point forward.
 */
export * from "./schema/identity";
export * from "./schema/scanner";
export * from "./schema/questionnaire";
export * from "./schema/answers";
export * from "./schema/vendor";
export * from "./schema/recommendation";
export * from "./schema/report";
export * from "./schema/knowledge";
export * from "./schema/implementation";

/* ------------------------------------------------------------------
 * Backward-compat aliases for feature-001 consumer code.
 *
 * Feature 003 renamed `admins` -> `users` and `scores` -> `readinessScores`
 * per data-model.md §K and §F. Feature-001 callers (lib/auth/config.ts,
 * lib/export/build.ts, scripts/seed-admin.ts, app/admin/projects/[id]/*)
 * still import the old names. Re-exporting under the legacy identifiers
 * keeps those call sites working while the schema in storage uses the
 * new tables (the `users` table IS the table renamed `admins` in 001's
 * MySQL schema; the MySQL->Postgres migration handles the data move).
 *
 * Long-term: rename the imports in feature-001 paths and drop these
 * aliases. Tracked as a follow-up in tasks.md polish phase.
 * ------------------------------------------------------------------ */
export { users as admins } from "./schema/identity";
export { readinessScores as scores } from "./schema/recommendation";
