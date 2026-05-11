# Phase 1 Data Model: Hotel Audit Platform

**Date**: 2026-05-09
**Branch**: `001-hotel-audit-platform`
**Storage**: SQLite via Drizzle ORM, file at `audit/data/audit.sqlite`

All tables use `id` as the primary key. Timestamps are stored as Unix epoch
seconds (`integer` with Drizzle's `{ mode: 'timestamp' }` mapper). Booleans
are `integer 0|1`.

## Entity overview

```
┌────────────┐ 1   1 ┌────────────┐ 1   N ┌──────────────┐
│ AdminUser  │───────│  Project   │───────│ InternalNote │
└────────────┘ owns  └────────────┘ has   └──────────────┘
                            │ 1
                            │ has
                            │ 1
                     ┌────────────┐ 1   N ┌──────────────┐
                     │ Submission │───────│   Answer     │
                     └────────────┘ has   └──────────────┘
                            │ 1
                            │ has
                            │ N
                       ┌─────────┐
                       │  Score  │
                       └─────────┘

┌────────────────┐
│  AuditLogEntry │  (action log, references AdminUser + Project, no FK enforcement)
└────────────────┘
```

## Tables

### `admins`

V1 contains exactly one row; table sized for future multi-admin (Q3).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `email` | `text` UNIQUE NOT NULL | login identifier |
| `password_hash` | `text` NOT NULL | Argon2id (`@node-rs/argon2`) |
| `created_at` | `integer` NOT NULL | epoch s |
| `last_login_at` | `integer` NULL | epoch s |

**Validation**: `email` matches RFC 5322 simplified; `password_hash` never
returned by any query that hydrates a session payload.

---

### `projects`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `label` | `text` NOT NULL | admin-set internal label |
| `hotel_name` | `text` NULL | pre-filled or client-filled (Section 1 required) |
| `contact_email` | `text` NOT NULL | admin pre-fill at creation |
| `priority` | `text` NOT NULL DEFAULT `'medium'` | enum: `low | medium | high` |
| `status` | `text` NOT NULL DEFAULT `'draft'` | enum: `draft | awaiting | in_progress | submitted | reopened | purged` |
| `token_hash` | `text` NOT NULL | SHA-256 of access token (R6) |
| `token_revoked_at` | `integer` NULL | revocation timestamp |
| `ongoing_engagement` | `integer` NOT NULL DEFAULT `0` | 0/1; suspends auto-purge clock (FR-044b) |
| `created_at` | `integer` NOT NULL | |
| `sent_at` | `integer` NULL | first time the URL was viewed |
| `last_admin_activity_at` | `integer` NOT NULL | drives 36-month purge clock |
| `submitted_at` | `integer` NULL | first submission (preserved across reopens) |
| `last_edited_at` | `integer` NULL | last client edit timestamp |
| `created_by` | `text` NOT NULL | FK → `admins.id` |

**Indexes**: unique on `token_hash`; non-unique on `(status, last_admin_activity_at)`
to make the dashboard list query and the purge sweep both fast.

**State transitions**:

```
draft → awaiting (URL generated)
awaiting → in_progress (first autosave from client)
in_progress → submitted (client submits)
submitted → reopened (admin reopens)
reopened → submitted (client re-submits)
* → purged (36-month sweep; tombstone retains label + dates only)
* → (deleted) (admin hard-delete via dashboard)
```

`token_revoked_at` is orthogonal to `status` — a project can be `submitted`
*and* revoked.

---

### `submissions`

One row per project (1:1 ownership; modeled separately so future iterations
can carry multiple drafts or template revisions without schema churn).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `project_id` | `text` UNIQUE NOT NULL | FK → `projects.id` ON DELETE CASCADE |
| `completion_pct` | `integer` NOT NULL DEFAULT `0` | 0..100, derived from answered required+optional fields |
| `created_at` | `integer` NOT NULL | |
| `updated_at` | `integer` NOT NULL | bumped on every autosave |

---

### `answers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `submission_id` | `text` NOT NULL | FK → `submissions.id` ON DELETE CASCADE |
| `field_id` | `text` NOT NULL | matches `Section.field.id` from `lib/form-schema/sections.ts` |
| `value_json` | `text` NOT NULL | JSON-encoded value; type validated at write time by Zod |
| `updated_at` | `integer` NOT NULL | last write |
| `source` | `text` NOT NULL DEFAULT `'client'` | enum: `client | admin_prefill` (audit trail for who entered each value) |

**Indexes**: unique on `(submission_id, field_id)` — answers are upserted by
this composite key by the autosave server action.

**Validation**: `field_id` must exist in the active form schema (FK-style
validation in app code; not enforced at SQL level to keep schema evolution
flexible).

---

### `scores`

One row per (submission, score-name). Recomputed deterministically on
submission and on reopen → resubmit (FR-032).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `submission_id` | `text` NOT NULL | FK → `submissions.id` ON DELETE CASCADE |
| `name` | `text` NOT NULL | enum: `automation_opportunity | operational_complexity | modernization_readiness | digital_maturity` |
| `value` | `integer` NOT NULL | 0..100 |
| `band` | `text` NOT NULL | enum: `low | medium | high` |
| `basis_json` | `text` NOT NULL | JSON-encoded array of field_ids that drove the score (explainability) |
| `computed_at` | `integer` NOT NULL | |

**Indexes**: unique on `(submission_id, name)`.

---

### `internal_notes`

Append-only thread per project (Q5).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `project_id` | `text` NOT NULL | FK → `projects.id` ON DELETE CASCADE |
| `author_id` | `text` NOT NULL | FK → `admins.id` |
| `body` | `text` NOT NULL | free text, ≤ 5 000 chars |
| `created_at` | `integer` NOT NULL | |

**Constraints**: `body` length validated at server-action layer; no UPDATE
or DELETE statements are issued by application code in V1 (immutability
enforced by code path, not SQL trigger — kept pragmatic).

---

### `audit_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUIDv7 |
| `actor_id` | `text` NULL | FK → `admins.id`; null for system actions (e.g., auto-purge) |
| `action` | `text` NOT NULL | enum: `project.create | project.delete | project.revoke | project.reopen | project.mark_ongoing | project.export_json | project.purge | admin.login | admin.login_failed` |
| `project_id` | `text` NULL | FK → `projects.id`; null for non-project actions |
| `metadata_json` | `text` NULL | small JSON for context (IP for failed login, etc.) |
| `created_at` | `integer` NOT NULL | |

**Indexes**: non-unique on `(project_id, created_at DESC)` and `(action, created_at DESC)`.

---

### `meta`

Single-row config / runtime markers.

| Column | Type | Notes |
|--------|------|-------|
| `key` | `text` PK | |
| `value` | `text` NOT NULL | |
| `updated_at` | `integer` NOT NULL | |

Known keys: `last_purge_sweep_at`, `schema_version`.

## Derived values (not stored)

- **Completion percentage** lives on `submissions.completion_pct` for fast
  dashboard rendering, but is recomputed by `lib/form-schema/completion.ts`
  on every autosave. Formula: `(answeredFieldsWeighted / totalFieldsWeighted) * 100`,
  where required fields weight 2× optional fields.
- **`audit-log` retention**: kept indefinitely (operational record), unaffected
  by the 36-month submission purge, exempted in the privacy notice as
  "données de traçabilité interne, non personnelles".

## Migration & seed

- `npm run db:generate` — drizzle-kit generates SQL migrations from
  `db/schema.ts`.
- `npm run db:migrate` — applies migrations to `audit/data/audit.sqlite`.
- `npm run db:seed:admin` — interactive prompt for the V1 admin's email +
  password; password hashed at seed time.

## Form schema → Answer field_id catalog

`lib/form-schema/sections.ts` is the single source of truth for the ~80
fields. Each field carries `{ id, type, required, helpKey, validation, scoreWeights }`.
Ids are stable, snake_cased, and prefixed by section number — e.g.
`s1.hotel_name`, `s2.pms.provider`, `s3.most_manual_operations`,
`s6.interest_in_automation`, `s8.open_comments`. The Answer table stores
exactly these ids; renaming is a careful migration concern explicitly listed
under FR-045 / SC-009.
