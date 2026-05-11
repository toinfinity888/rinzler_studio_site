# Admin (Authenticated) API Contracts

All endpoints live under `app/(admin)/`. Auth.js middleware enforces a
valid session JWT; unauthenticated requests redirect to `/admin/login`.
The entire admin surface is `noindex` via `next.config.mjs` headers and
per-page metadata. Every mutating action writes an `audit_log` row with
`actor_id = session.user.id`.

## Auth

### POST /api/auth/callback/credentials (Auth.js)

Standard Auth.js Credentials flow. Verifies email + Argon2id password.
- 200 → JWT session cookie (HttpOnly, Secure, SameSite=Lax, scoped to `/`).
- 401 → generic "Identifiants invalides" (no email-vs-password disambiguation).
- Rate limit: 10 attempts / 15 min per IP; lockout warning after 5.

### POST /api/auth/signout

Clears the session cookie. Records `admin.login` (no — this is `admin.logout`,
added to the action enum).

## Projects

### GET /admin/projects

Server-rendered list. Supports query params for sort/filter (FR-030):
`?sort=last_updated|priority|completion_pct|status|score:<name>` and
`?status=...&priority=...`.
Renders into `ProjectsTable` component. Tombstoned (`purged`) projects appear
greyed out at the bottom of the list.

### Server Action: `createProject(input: { label: string; contactEmail: string; hotelName?: string; priority?: Priority; prefill?: Record<FieldId, JsonValue> }): { ok: true; projectId: string; tokenPlaintext: string }`

- Generates the access token (R6), stores its SHA-256 hash, returns the
  plaintext **once** so the admin can copy it to the clipboard.
- Creates the `projects` row + a paired `submissions` row.
- Stores any `prefill` values as `answers` rows with `source = 'admin_prefill'`
  (FR-005).
- Audit-log: `project.create`.

### Server Action: `revokeProjectToken(projectId: string): { ok: true }`

- Sets `projects.token_revoked_at = now`.
- Audit-log: `project.revoke`. Subsequent client requests on the URL hit the
  404 page (FR-004).

### Server Action: `reopenProject(projectId: string): { ok: true }`

- Sets `projects.status = 'reopened'` (allows further client edits and
  re-submission).
- Preserves `submitted_at`; new `last_edited_at` will be recorded on next
  client edit.
- Audit-log: `project.reopen`.

### Server Action: `markOngoingEngagement(projectId: string, ongoing: boolean): { ok: true }`

- Toggles `projects.ongoing_engagement`. Suspends or resumes the 36-month
  auto-purge clock (FR-044b).
- Audit-log: `project.mark_ongoing` (metadata: `{ ongoing: true|false }`).

### Server Action: `deleteProject(projectId: string): { ok: true }`

- Hard-deletes the project and all related rows (CASCADE).
- Requires a confirmation prompt in the UI; the admin must type the project
  label to confirm.
- Audit-log: `project.delete`.

### Server Action: `appendInternalNote(projectId: string, body: string): { ok: true; noteId: string }`

- Appends a row to `internal_notes`. `body` ≤ 5 000 chars, trimmed; empty
  bodies rejected.
- Notes are immutable (Q5): no `editNote` or `deleteNote` action exists in V1.
- Audit-log: NOT recorded (notes are not sensitive admin actions; they are
  admin content).

### GET /admin/projects/[id]

Detail page: hotel info + answers grouped by section + scores + notes thread
+ "add note" composer + action buttons (revoke / reopen / mark ongoing /
delete / export).

### GET /admin/projects/[id]/report

Print-ready, brand-styled HTML view of the submission for browser → PDF.
Includes every answer, all scores, project metadata. Internal notes are
**excluded** by default; query flag `?includeNotes=1` opts in.

### GET /admin/projects/[id]/export

Returns `application/json` download (`Content-Disposition: attachment`)
conforming to `contracts/json-export.schema.json` (R7).

- Default: notes excluded.
- `?include=notes` includes the notes thread.
- Audit-log: `project.export_json` (metadata: `{ includeNotes: true|false }`).

## Cron / Maintenance

### POST /api/cron/purge

Auto-purge sweep (R11). Requires `X-Cron-Secret` header matching `CRON_SECRET`
env. Idempotent: skips work if `meta.last_purge_sweep_at` is within 24 h
unless `?force=1`.
- 200 → `{ purged: number }`.
- 401 → on missing/invalid secret.

Triggered daily by an o2switch cPanel cron entry:
```
15 3 * * * curl -fsS -X POST -H "X-Cron-Secret: $CRON_SECRET" https://audit.rinzlerstudio.com/api/cron/purge
```
