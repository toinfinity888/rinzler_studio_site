# Client (Tokenized) API Contracts

All client-facing endpoints live under `app/(client)/a/[token]/` and
**never** require authentication beyond a valid `[token]`. Access tokens
are validated by SHA-256 hash lookup against `projects.token_hash` with a
constant-time comparison. Revoked tokens, expired-by-purge tokens, and
tokens that simply do not exist all return the same generic 404 page
(`app/(client)/revoked/page.tsx`) — no enumeration leak (FR-006).

All actions emit a Plausible custom event server-side via the Plausible
HTTP API (`audit_section_completed`, `audit_submitted`).

## GET /a/[token]

**Purpose**: Render the form landing or jump to the in-progress section.

- 200 → server-rendered React page; first load includes:
  - Project's pre-filled answers (admin-supplied values)
  - The form schema (sections + fields + help keys)
  - Locale (FR for V1)
- 404 → revoked / not-found (generic page)

Server action is implicit (Next.js page render reads from DB during SSR).

## Server Action: `saveAnswers(token: string, partial: Record<FieldId, JsonValue>): { ok: true; updatedAt: number } | { ok: false; reason: 'revoked' | 'invalid' | 'rate_limited' }`

**Purpose**: Autosave one or more answer-field changes (FR-008, R5).

- Debounced client-side at 1.5 s after the last keystroke; flushed on
  section navigation and `beforeunload`.
- Server validates each `field_id` against the active form schema and the
  value against the field's Zod type.
- Upserts into `answers` keyed on `(submission_id, field_id)`.
- Bumps `submissions.updated_at`, `projects.last_edited_at`, recomputes
  `submissions.completion_pct`.
- Sets `projects.status` to `in_progress` on the first save (if currently
  `awaiting` or `draft`).
- Rate-limit: max 30 calls / min per token (token-bucket in-memory; spillover
  to localStorage retry queue).

**Error contract**:
- `revoked` → client form switches to a banner: "Cet audit n'est plus
  modifiable. Contactez votre consultant." No further saves attempted.
- `invalid` → discrete inline error on the offending field; values for other
  fields in the same payload are still persisted.
- `rate_limited` → client backs off (exponential, capped at 30 s) and shows
  the "saving…" indicator.

## Server Action: `submitAudit(token: string): { ok: true; submittedAt: number } | { ok: false; missingRequired: FieldId[] } | { ok: false; reason: 'revoked' }`

**Purpose**: Final submission (FR-014).

- Validates that all Section 1 required fields are filled.
- Sets `projects.status = 'submitted'`, sets `projects.submitted_at` (first
  time only), bumps `submissions.completion_pct` recompute.
- Triggers scoring run (R8) → upserts `scores`.
- Returns the URL for the confirmation page.
- Idempotent: re-submitting an already-submitted project returns `ok: true`
  but is a no-op for `submitted_at`; a new `last_edited_at` is recorded.

## GET /a/[token]/confirmation

Static FR confirmation page. No data exposure beyond the project's hotel
name (echoed back as social proof).

## Plausible events (server-emitted)

| Event | When |
|-------|------|
| `audit_section_completed` | First time `submissions.completion_pct` crosses each section's threshold |
| `audit_submitted` | After successful `submitAudit` |
| `audit_revoked_view` | When a revoked token loads the 404 page |

No PII is sent in event props — only project id (hashed).
