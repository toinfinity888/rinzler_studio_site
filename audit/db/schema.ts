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
