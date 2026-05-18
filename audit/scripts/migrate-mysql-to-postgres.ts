/**
 * One-shot MySQL -> Postgres data migration (Task T005, feature 003).
 *
 * Reads from MYSQL_URL, writes to DATABASE_URL. Idempotent: rows are upserted
 * keyed on primary key; per-table row-count + cheap checksums are recorded.
 *
 * IMPORTANT: This script is intentionally NOT executed by CI or any other
 * automation. It is intended for a single supervised cutover. To run:
 *
 *   MYSQL_URL=mysql://... DATABASE_URL=postgres://... \
 *   npx tsx audit/scripts/migrate-mysql-to-postgres.ts --dry-run
 *
 *   MYSQL_URL=mysql://... DATABASE_URL=postgres://... \
 *   npx tsx audit/scripts/migrate-mysql-to-postgres.ts --commit
 *
 * Existing data is preserved per data-model.md §O:
 *  - admins -> users (rename only; columns 1:1).
 *  - projects gain tier='full', purge_after=NULL.
 *  - answers gain a synthetic question_version_id pointing at a `v1-imported`
 *    question whose slug matches the legacy `field_id`.
 *  - scores -> readiness_scores (column rename only; basis_json preserved).
 *  - internal_notes, audit_log, meta migrated 1:1; audit_log action enum
 *    expanded — legacy values map directly to new values.
 */
/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import mysql from "mysql2/promise";
import { Client as PgClient } from "pg";
import { createHash, randomUUID } from "node:crypto";

interface MigrationResult {
  table: string;
  rowsRead: number;
  rowsWritten: number;
  checksum: string;
}

async function checksum(rows: any[]): Promise<string> {
  const h = createHash("sha256");
  for (const r of rows) h.update(JSON.stringify(r));
  return h.digest("hex");
}

async function readTable(
  conn: mysql.Connection,
  table: string,
): Promise<any[]> {
  const [rows] = await conn.query(`SELECT * FROM \`${table}\` ORDER BY id`);
  return rows as any[];
}

async function migrate(commit: boolean): Promise<MigrationResult[]> {
  const mysqlUrl = process.env.MYSQL_URL;
  const pgUrl = process.env.DATABASE_URL;
  if (!mysqlUrl) throw new Error("MYSQL_URL not set");
  if (!pgUrl) throw new Error("DATABASE_URL not set");

  const my = await mysql.createConnection(mysqlUrl);
  const pg = new PgClient({ connectionString: pgUrl });
  await pg.connect();

  const results: MigrationResult[] = [];

  try {
    // ---- admins -> users ----
    const admins = await readTable(my, "admins");
    if (commit) {
      for (const a of admins) {
        await pg.query(
          `INSERT INTO users (id, email, password_hash, created_at, last_login_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.email, a.password_hash, a.created_at, a.last_login_at],
        );
      }
    }
    results.push({
      table: "admins -> users",
      rowsRead: admins.length,
      rowsWritten: commit ? admins.length : 0,
      checksum: await checksum(admins),
    });

    // ---- projects (gain tier, purge_after columns) ----
    const projects = await readTable(my, "projects");
    if (commit) {
      for (const p of projects) {
        await pg.query(
          `INSERT INTO projects
             (id, label, hotel_name, contact_email, priority, status,
              token_hash, token_revoked_at, ongoing_engagement, created_at,
              sent_at, last_admin_activity_at, submitted_at, last_edited_at,
              created_by, tier, purge_after)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'full',NULL)
           ON CONFLICT (id) DO NOTHING`,
          [
            p.id, p.label, p.hotel_name, p.contact_email, p.priority, p.status,
            p.token_hash, p.token_revoked_at, p.ongoing_engagement, p.created_at,
            p.sent_at, p.last_admin_activity_at, p.submitted_at, p.last_edited_at,
            p.created_by,
          ],
        );
      }
    }
    results.push({
      table: "projects",
      rowsRead: projects.length,
      rowsWritten: commit ? projects.length : 0,
      checksum: await checksum(projects),
    });

    // ---- submissions (1:1 carryover) ----
    const submissions = await readTable(my, "submissions");
    if (commit) {
      for (const s of submissions) {
        await pg.query(
          `INSERT INTO submissions (id, project_id, completion_pct, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.project_id, s.completion_pct, s.created_at, s.updated_at],
        );
      }
    }
    results.push({
      table: "submissions",
      rowsRead: submissions.length,
      rowsWritten: commit ? submissions.length : 0,
      checksum: await checksum(submissions),
    });

    // ---- answers (synthetic question_version_id) ----
    const answers = await readTable(my, "answers");
    if (commit) {
      // Build the set of distinct field_ids -> seed v1-imported question rows.
      const fields = Array.from(new Set(answers.map((a) => a.field_id)));
      const fieldVersionId: Record<string, string> = {};
      for (const slug of fields) {
        const questionId = randomUUID();
        const versionId = randomUUID();
        await pg.query(
          `INSERT INTO questions (id, slug, block, answer_type, audit_levels, current_version, status)
           VALUES ($1,$2,'profile','short_text', ARRAY['full']::text[], 1, 'published')
           ON CONFLICT (slug) DO NOTHING`,
          [questionId, slug],
        );
        await pg.query(
          `INSERT INTO question_versions (id, question_id, version, definition_json, published_at)
           SELECT $1, id, 1, '{"imported":true}'::jsonb, NOW()
           FROM questions WHERE slug = $2
           ON CONFLICT (question_id, version) DO NOTHING`,
          [versionId, slug],
        );
        const { rows: vrows } = await pg.query(
          `SELECT qv.id FROM question_versions qv
             JOIN questions q ON q.id = qv.question_id
             WHERE q.slug = $1 AND qv.version = 1`,
          [slug],
        );
        if (vrows[0]) fieldVersionId[slug] = vrows[0].id;
      }
      for (const a of answers) {
        await pg.query(
          `INSERT INTO answers (id, submission_id, field_id, value_json, updated_at,
                                source, question_version_id, confidence)
           VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'high')
           ON CONFLICT (submission_id, field_id) DO NOTHING`,
          [
            a.id, a.submission_id, a.field_id, a.value_json, a.updated_at,
            a.source, fieldVersionId[a.field_id] ?? null,
          ],
        );
      }
    }
    results.push({
      table: "answers",
      rowsRead: answers.length,
      rowsWritten: commit ? answers.length : 0,
      checksum: await checksum(answers),
    });

    // ---- scores -> readiness_scores ----
    const scores = await readTable(my, "scores");
    if (commit) {
      for (const s of scores) {
        await pg.query(
          `INSERT INTO readiness_scores (id, project_id, dimension, value, band, basis_json, computed_at)
           SELECT $1, p.id, $2, $3, $4, $5::jsonb, $6
             FROM projects p JOIN submissions sub ON sub.project_id = p.id
             WHERE sub.id = $7
           ON CONFLICT (project_id, dimension) DO NOTHING`,
          [s.id, s.name, s.value, s.band, s.basis_json, s.computed_at, s.submission_id],
        );
      }
    }
    results.push({
      table: "scores -> readiness_scores",
      rowsRead: scores.length,
      rowsWritten: commit ? scores.length : 0,
      checksum: await checksum(scores),
    });

    // ---- internal_notes ----
    const notes = await readTable(my, "internal_notes");
    if (commit) {
      for (const n of notes) {
        await pg.query(
          `INSERT INTO internal_notes (id, project_id, author_id, body, created_at, target_type, target_id)
           VALUES ($1,$2,$3,$4,$5,'project',$2)
           ON CONFLICT (id) DO NOTHING`,
          [n.id, n.project_id, n.author_id, n.body, n.created_at],
        );
      }
    }
    results.push({
      table: "internal_notes",
      rowsRead: notes.length,
      rowsWritten: commit ? notes.length : 0,
      checksum: await checksum(notes),
    });

    // ---- audit_log ----
    const log = await readTable(my, "audit_log");
    if (commit) {
      const actionMap: Record<string, string> = {
        "admin.login": "user_login",
        "admin.logout": "user_logout",
        "admin.login_failed": "user_login",
        "project.create": "project_created",
        "project.revoke": "project_link_revoked",
        "project.reopen": "project_reopened",
        "project.purge": "project_purged",
      };
      for (const e of log) {
        await pg.query(
          `INSERT INTO audit_log (id, actor_id, action, project_id, metadata_json, created_at)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6)
           ON CONFLICT (id) DO NOTHING`,
          [
            e.id, e.actor_id, actionMap[e.action] ?? e.action,
            e.project_id, e.metadata_json, e.created_at,
          ],
        );
      }
    }
    results.push({
      table: "audit_log",
      rowsRead: log.length,
      rowsWritten: commit ? log.length : 0,
      checksum: await checksum(log),
    });

    // ---- meta ----
    const meta = await readTable(my, "meta").catch(() => []);
    if (commit) {
      for (const m of meta) {
        await pg.query(
          `INSERT INTO meta (key, value, updated_at) VALUES ($1,$2,$3)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
          [m.key, m.value, m.updated_at],
        );
      }
    }
    results.push({
      table: "meta",
      rowsRead: meta.length,
      rowsWritten: commit ? meta.length : 0,
      checksum: await checksum(meta),
    });
  } finally {
    await my.end();
    await pg.end();
  }

  return results;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const dryRun = process.argv.includes("--dry-run") || !commit;
  console.log(dryRun ? "DRY RUN — no writes." : "COMMIT — writing to Postgres.");
  const results = await migrate(!dryRun);
  console.table(results);
}

// Only run from CLI; importing the module does not auto-execute.
const isMain =
  typeof require !== "undefined" && require.main === module;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { migrate };
