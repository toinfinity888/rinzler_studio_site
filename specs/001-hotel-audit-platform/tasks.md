---
description: "Task list for the Hotel Audit Platform feature"
---

# Tasks: Hotel Audit Platform

**Input**: Design documents from `/specs/001-hotel-audit-platform/`
**Prerequisites**: plan.md, spec.md (5 user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included for security/authorization paths (SC-007),
JSON export schema (SC-008), scoring determinism (FR-031), token generation
(FR-002), and end-to-end golden flows (quickstart.md). Tests are not
required for every implementation task.

**Organization**: Tasks are grouped by user story. US1, US2, and US3 are all
P1 — the V1 launch requires all three; US1 is the technical entry point and
is marked 🎯 MVP because it unblocks US2/US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story for traceability (US1, US2, US3, US4, US5)
- All file paths are repo-relative; the audit app lives under `audit/`

## Path Conventions

This is a **Web application** project per plan.md. Two `package.json` files
live in the repo (no monorepo tooling); the marketing site at `src/` is
unchanged. All audit-app code lives under `audit/` per the structure tree
in plan.md § Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js audit application and port brand tokens.

- [X] T001 Create the `audit/` directory at the repository root and add it to a new `.gitignore` entry for `audit/.next/`, `audit/node_modules/`, `audit/data/`, and `audit/.env*` (keep `audit/.env.example`)
- [X] T002 Scaffolded Next.js 15.5.18 + TS + Tailwind v4 (CSS-first; no `tailwind.config.ts` needed) into `audit/` via `npx create-next-app@15 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --no-turbopack --skip-install`. **Deviation**: scaffold ships **Tailwind v4** (not v3); v4 uses `@theme` directives in CSS, so T009's separate config file is moot.
- [X] T003 Installed runtime dependencies in `audit/`: drizzle-orm, better-sqlite3, next-auth@beta (v5.0.0-beta.31), @auth/drizzle-adapter, @node-rs/argon2, zod (v4), react-hook-form, @hookform/resolvers, next-themes
- [X] T004 [P] Installed dev dependencies in `audit/`: drizzle-kit, vitest, @vitest/coverage-v8, @playwright/test, @types/better-sqlite3, tsx, ajv (for export-schema test). **Skipped** `eslint-plugin-tailwindcss` — no stable Tailwind v4 support yet; will revisit.
- [X] T005 [P] `audit/tsconfig.json` extended with `noUncheckedIndexedAccess: true` and `noImplicitOverride: true` (scaffold already had `strict: true` and `@/*` alias).
- [X] T006 [P] ESLint flat config (`audit/eslint.config.mjs`) from scaffold extends `next/core-web-vitals` + `next/typescript`. Tailwind plugin deferred (see T004 note).
- [X] T007 Copied `src/styles/tokens.css` → `audit/styles/tokens.css` verbatim (mirrored brand DNA).
- [X] T008 Copied `src/assets/icons/rinzler_studio_logo_white.svg` → `audit/public/brand/logo.svg`; `src/assets/icons/favicon.png` → `audit/public/favicon.png`.
- [X] T009 Folded into T010 — Tailwind v4 declares theme via `@theme inline` in CSS, no separate `tailwind.config.ts` file.
- [X] T010 Authored `audit/app/globals.css`: `@import "tailwindcss"` + `@import "../styles/tokens.css"` + `@theme inline { … }` mapping every brand token (colors, accents, typography, radii, shadows, glows) to a Tailwind utility namespace; added `.glass` and `.gradient-text` brand mixins; added `@media (prefers-reduced-motion: reduce)` block.
- [X] T011 `audit/next.config.ts`: `output: 'standalone'`, `experimental.serverActions.bodySizeLimit: '128kb'`, `serverExternalPackages: ['better-sqlite3', '@node-rs/argon2']` (native bindings can't be bundled), and a `headers()` block emitting `X-Robots-Tag: noindex, nofollow` for `/admin/*`, `/a/*`, and `/api/*`.
- [X] T012 Authored `audit/.env.example` (DATABASE_URL, AUTH_SECRET, AUTH_URL, CRON_SECRET, PLAUSIBLE_DOMAIN locked to `audit.rinzlerstudio.com`); created `audit/data/.gitkeep`. Also added `audit/.nvmrc` pinning Node 20 so production parity is enforced (deploy target = o2switch Node 20 LTS; local dev currently on v23).
- [X] T013 Added npm scripts to `audit/package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed:admin`.

**Checkpoint**: `cd audit && npm run dev` boots Next.js at `http://localhost:3000` showing the default page.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, declarative form schema, brand-aligned UI primitives, auth scaffolding, and shared library modules. **No user-story work can begin until this phase is complete.**

### Database & ORM

- [X] T014 Create `audit/drizzle.config.ts` pointing at `audit/db/schema.ts` with output dir `audit/db/migrations` and SQLite dialect via `better-sqlite3`
- [X] T015 Author `audit/db/schema.ts` defining all 7 tables exactly as data-model.md specifies: `admins`, `projects`, `submissions`, `answers`, `scores`, `internal_notes`, `audit_log`, `meta` — with all columns, types, defaults, FK relations (CASCADE), and the unique/composite indexes (`projects.token_hash`, `(submission_id, field_id)`, `(submission_id, name)`, `(project_id, created_at DESC)`)
- [X] T016 Author `audit/lib/db/index.ts` that exports a singleton `better-sqlite3` Drizzle client reading `DATABASE_URL` (defaults to `file:./data/audit.sqlite`), enables WAL mode at startup, and exposes typed query helpers
- [X] T017 Run `npm run db:generate` to produce the initial SQL migration in `audit/db/migrations/`, then `npm run db:migrate` to apply it to a freshly-created `audit/data/audit.sqlite`
- [X] T018 [P] Author `audit/scripts/seed-admin.ts` (run via `tsx`) that prompts interactively for admin email + password, hashes the password with `@node-rs/argon2` (Argon2id, default params), and inserts a single row into `admins`; idempotent (refuses to overwrite an existing row unless `--force` is passed)

### Declarative form schema (single source of truth — FR-023, FR-045)

- [X] T019 Author `audit/lib/form-schema/types.ts` defining the `FieldType` union (`text | email | url | number | select | multiselect | slider | textarea | radio-group | system-block`), the `FieldDef` type (`{ id, type, required, helpKey, validation, scoreWeights? }`), the `SectionDef` type, and the `Section[]` export type
- [X] T020 Author `audit/lib/form-schema/sections.ts` exporting the canonical `SECTIONS: Section[]` covering all 8 sections from FR-015..FR-022 with stable snake_cased ids prefixed by section number (e.g. `s1.hotel_name`, `s2.pms.provider`, `s2.pms.monthly_cost`, `s3.most_manual_operations`, `s6.interest_in_automation`, `s8.open_comments`); Section 2 uses `system-block` field type for each of the 10 system categories
- [X] T021 [P] Author `audit/lib/form-schema/fr.ts` exporting `FR: Record<string, { label: string; help?: string; placeholder?: string; options?: { value: string; label: string }[] }>` keyed by field id, with French copy for every field defined in T020 — including plain-language tooltips for technical jargon (PMS, channel manager, ADR, OTA, CRM, CMS)
- [X] T022 [P] Author `audit/lib/form-schema/validation.ts` exporting `buildZodSchema(sections)` that produces a Zod object schema validating only Section 1 required fields (FR-010); other fields are `.optional()`; per-field type validation derived from `FieldDef.validation`. **All `textarea` field types (incl. Section 8 open comments and every "frustrations" field) MUST be capped at 5 000 characters server-side via `.max(5000)`** — closes the long-free-text edge case in spec.md (FR-022, FR-016 frustrations fields)
- [X] T023 [P] Author `audit/lib/form-schema/completion.ts` exporting `computeCompletionPct(answers, sections)` using the formula in data-model.md (required fields weight 2× optional)
- [X] T024 [P] Author `audit/lib/form-schema/i18n.ts` exporting a tiny `t(key, locale)` helper that reads from `fr.ts` (only locale in V1) — replaces `next-intl` per research.md R12

### Tokens, auth, audit log, scoring scaffold, export

- [X] T025 Author `audit/lib/tokens/index.ts` exporting `generateToken()` (returns plaintext + sha256 hash via `crypto.randomBytes(24).toString('base64url')`), `hashToken(plaintext)`, and `verifyToken(plaintext, storedHash)` using `crypto.timingSafeEqual` for constant-time comparison (R6)
- [X] T026 Author `audit/lib/auth/config.ts` setting up Auth.js v5 with the Credentials provider: takes `{ email, password }`, looks up `admins` row, verifies hash via `@node-rs/argon2`, returns `{ id, email }` session payload; uses JWT sessions; `AUTH_SECRET` from env; per-IP rate limit (10 attempts / 15 min) implemented as in-memory token bucket in the same file
- [X] T027 Author `audit/middleware.ts` enforcing the `/admin/*` route protection: any unauthenticated request to `/admin/*` (except `/admin/login`) redirects to `/admin/login?next=…`; tokenized `/a/[token]` routes are excluded
- [X] T028 [P] Author `audit/lib/auth/session.ts` exporting `getSession()` (server-side helper) and `requireAdmin()` (throws redirect if no session)
- [X] T029 [P] Author `audit/lib/audit-log/index.ts` exporting `writeAuditEntry({ actorId, action, projectId?, metadata? })` that inserts a row into `audit_log` with the action enum from data-model.md
- [X] T030 [P] Author `audit/lib/scoring/types.ts` defining the `Scorer` interface `(answers: Map<string, unknown>) => { value: number; band: 'low'|'medium'|'high'; basis: string[] }` and a `Score` aggregate type — concrete scorers come in Phase 6
- [X] T031 Author `audit/lib/scoring/index.ts` exporting `runAllScores(answers)` that calls every registered scorer and returns the upsert payload — initially returns 4 stub scores all valued 0/`low` so US1–US3 can be wired without blocking on US4
- [X] T032 [P] Author `audit/lib/export/schema.ts` exporting a Zod schema named `ExportV1` exactly mirroring `contracts/json-export.schema.json` (top-level `schemaVersion: "audit-export.v1"` discriminator, project, submission, scores, optional `internalNotes`)
- [X] T033 Author `audit/lib/export/build.ts` exporting `buildExport(projectId, { includeNotes }): ExportV1` that hydrates the project, submission, answers (grouped into 8 sections with FR labels), scores, and conditionally notes; throws if the result fails `ExportV1.safeParse`
- [X] T034 [P] Author `audit/lib/purge/sweep.ts` exporting `runPurgeSweep({ now, dryRun? })` that finds projects with `last_admin_activity_at < now - 36 months AND ongoing_engagement = 0`, deletes their `answers`/`scores`/`internal_notes`, marks `projects.status = 'purged'`, writes one `audit_log` entry per project, and updates `meta.last_purge_sweep_at`

### UI primitives (brand-aligned, mirror marketing site patterns — research.md R10)

- [X] T035 [P] Author `audit/components/ui/Button.tsx` mirroring the marketing site's `.btn` glass-morphism (semi-transparent white, `backdrop-filter: blur(16px) saturate(160%)`, inset 1px border, 8px 24px shadow, hover lift, focus ring); variants: `primary | secondary | outline | ghost`; sizes: `sm | md`
- [X] T036 [P] Author `audit/components/ui/Card.tsx` mirroring `.calc-card` (dark background, 12px radius, subtle border, optional icon-titled header slot)
- [X] T037 [P] Author `audit/components/ui/Input.tsx`, `audit/components/ui/Textarea.tsx`, `audit/components/ui/Select.tsx`: dark `--color-bg-secondary` background, 2px `--color-bg-tertiary` border, cyan focus ring with `0 0 0 3px rgba(0,217,255,0.1)` glow, 44px min-height for touch
- [X] T038 [P] Author `audit/components/ui/Slider.tsx`: 1–10 difficulty slider with labelled poles; falls back to numeric `<input type="number">` on viewports ≤ 360 px (FR edge case)
- [X] T039 [P] Author `audit/components/ui/RadioGroup.tsx`: yes / no / unknown answer pattern
- [X] T040 [P] Author `audit/components/form/HelpTooltip.tsx` mirroring the marketing site's `.info-tooltip-trigger` pattern from `src/calculator.html` (info icon, hover/tap reveal, accessible via `aria-describedby`)
- [X] T041 [P] Author `audit/components/brand/Logo.tsx` (renders `/brand/logo.svg`, configurable height, `alt="Rinzler Studio"`) and `audit/components/brand/GradientText.tsx` (cyan→purple span, mirrors `.calc-gradient`) and `audit/components/brand/GlassPanel.tsx` (reusable glass container)
- [ ] T042 [P] Author `audit/components/ui/ThemeToggle.tsx` driven by `next-themes`; default theme `dark` for client form, persists per visitor (FR-038)

### Layouts

- [X] T043 Author `audit/app/layout.tsx` (root): import `globals.css`, set `lang="fr"`, load Inter via `next/font/google`, wrap children in `next-themes` provider with `defaultTheme="dark"`, attach `<head>` `<meta name="theme-color" content="#0a0a0f">` matching marketing site
- [X] T044 Author `audit/app/(client)/layout.tsx`: emit `<meta name="robots" content="noindex,nofollow">`, inject Plausible script `<script defer data-domain={env.PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js">`, render Logo header with link back to `https://rinzlerstudio.fr`
- [X] T045 Author `audit/app/(admin)/layout.tsx`: `requireAdmin()` at the top (redirects to `/admin/login` if no session), emit `noindex` meta, render minimal admin chrome (logo, "Déconnexion" link)

### Test infrastructure

- [X] T046 [P] Configure `audit/vitest.config.ts` with `environment: 'node'`, alias `@/*`, coverage thresholds 70% lines for `lib/`
- [X] T047 [P] Configure `audit/playwright.config.ts` with a single Chromium project, `webServer` running `npm run dev` on port 3000, `baseURL: 'http://localhost:3000'`
- [X] T048 [P] Author `audit/tests/unit/tokens.test.ts` covering `generateToken` entropy (32 base64url chars), `hashToken` determinism, and `verifyToken` constant-time correctness for matching/non-matching pairs (validates FR-002, R6)
- [X] T049 [P] Author `audit/tests/unit/form-schema.test.ts` asserting `SECTIONS` has exactly 8 sections, every Section 1 required field is present, every field id matches `^s[1-8]\.[a-z0-9_.]+$`, and `FR` has a label for every field id (catches drift)
- [X] T050 [P] Author `audit/tests/unit/completion.test.ts` covering `computeCompletionPct` with three fixtures: empty (0%), only Section 1 required filled (~25%), all answered (100%)

**Checkpoint**: All foundational pieces in place — DB exists, schema is loaded, auth scaffolding works, UI primitives render, brand tokens flow end-to-end. User-story work can now begin in parallel.

---

## Phase 3: User Story 1 — Consultant creates an engagement and sends an audit link (Priority: P1) 🎯 MVP

**Goal**: An authenticated admin can create a project, optionally pre-fill answers, and obtain a unique private URL the client can open without logging in.

**Independent Test**: After seeding an admin (T018), sign in at `/admin/login`, click "Nouveau projet", fill label + hotel name + contact email + 3 pre-filled fields, click "Générer le lien". The URL is copyable; opening it in incognito loads a branded landing page that displays the pre-filled hotel name with no auth prompt. The same project appears in `/admin/projects` with status "Awaiting response".

### Tests for User Story 1

- [ ] T051 [P] [US1] Authorization test in `audit/tests/integration/us1-auth.test.ts`: assert that GET `/admin/projects` without a session returns 307 to `/admin/login`; that GET `/a/<random-base64url>` returns the generic 404 page (never leaks "no such project"); and that a revoked token returns the same 404 (validates FR-006, SC-007)
- [ ] T052 [P] [US1] Integration test in `audit/tests/integration/us1-create-project.test.ts`: in-memory DB; call `createProject` server action; assert a `projects` row exists with hashed token (not plaintext), the returned plaintext token verifies, the paired `submissions` row is created with `completion_pct = 0`, pre-filled answers are persisted with `source = 'admin_prefill'`, and an `audit_log` `project.create` entry is written

### Implementation for User Story 1

- [X] T053 [US1] Author `audit/app/(admin)/login/page.tsx`: brand-styled login form (Card, Input, Button primitives) calling Auth.js `signIn('credentials')`; on failure shows "Identifiants invalides" without disambiguation; rate-limit response surfaces a generic "Veuillez réessayer dans quelques minutes"
- [X] T054 [US1] Author `audit/app/api/auth/[...nextauth]/route.ts` exporting Auth.js handlers from `lib/auth/config.ts`
- [X] T055 [P] [US1] Author `audit/app/(admin)/projects/page.tsx`: server component listing all projects (label, hotel name, status badge, `last_updated_at`, **inline `<Select>` priority editor wired to the `updateProjectPriority` server action (T083) so the admin can change priority directly from the row — satisfies FR-026**, "Copier le lien" / "Ouvrir" actions); empty-state CTA to "Nouveau projet"
- [X] T056 [US1] Author `audit/app/(admin)/projects/new/page.tsx`: form with required fields (label, hotel name, contact email). **Below the required block, render a "Pré-remplir des réponses (optionnel)" expandable accordion exposing every section (1–8); each section opens a sub-accordion of all its fields rendered through the same `SectionRenderer` (T065) used on the client side, in admin mode (no autosave indicator) — this satisfies FR-005 ("any field in any section") and reuses the schema-driven renderer so the admin pre-fill UI evolves automatically when fields are added.** Submit calls the `createProject` server action and shows the returned plaintext token in a `Card` with a one-click "Copier le lien" button (writes to clipboard via `navigator.clipboard.writeText`)
- [X] T057 [US1] Author `audit/app/(admin)/projects/actions.ts` exporting the `createProject` server action: validates input with Zod, calls `generateToken()`, inserts `projects` + `submissions` rows in a transaction, persists pre-filled answers with `source: 'admin_prefill'`, writes an `audit_log` `project.create` entry, returns `{ projectId, tokenPlaintext }` (per `contracts/admin-api.md`)
- [X] T058 [P] [US1] Author `audit/lib/projects/load-by-token.ts` exporting `loadProjectByToken(plaintext): { project, submission, prefillAnswers } | null` that hashes the plaintext, looks up the project, checks `token_revoked_at`, sets `sent_at` if null, and returns null on miss/revocation (no enumeration leak)
- [X] T059 [US1] Author `audit/app/(client)/a/[token]/page.tsx`: server component calling `loadProjectByToken`; on null returns `notFound()` (renders the shared 404). On hit, renders a brand-aligned landing screen showing the hotel name, a one-paragraph FR explainer of the audit + estimated time, a privacy notice line linking to `https://rinzlerstudio.fr/politique-confidentialite.html`, and a "Commencer" Button linking to `/a/[token]/form/s1`
- [X] T060 [P] [US1] Author `audit/app/(client)/revoked/page.tsx` and the global `app/(client)/not-found.tsx` rendering the generic "Ce lien n'est plus actif — contactez votre consultant" page (no project metadata leaked)

**Checkpoint**: User Story 1 functional. An admin can create a project and the client can land on the form (form filling itself comes in US2).

---

## Phase 4: User Story 2 — Hotel client completes the multi-section audit (Priority: P1)

**Goal**: The client navigates 8 sections via a polished multi-step form, autosaves continuously, can leave and return, and submits successfully.

**Independent Test**: Open a fresh tokenized URL, fill Section 1 required fields, partially fill Sections 2–4, close the tab, reopen the URL the next day, see prior answers restored, complete all sections, submit, see the confirmation screen. Project status flips to "Submitted" with completion 100%.

### Tests for User Story 2

- [ ] T061 [P] [US2] Integration test in `audit/tests/integration/us2-autosave.test.ts`: call `saveAnswers` with a partial payload; assert each `(submission_id, field_id)` is upserted (not duplicated), `submissions.updated_at` is bumped, `projects.last_edited_at` is updated, and project status transitions `awaiting → in_progress` on first save
- [ ] T062 [P] [US2] Integration test in `audit/tests/integration/us2-submit.test.ts`: call `submitAudit` with required Section 1 fields empty → returns `{ ok: false, missingRequired: [...] }`; fill them, call again → returns `{ ok: true }`, project status transitions to `submitted`, `submitted_at` is set on first submission only
- [ ] T063 [P] [US2] Integration test in `audit/tests/integration/us2-revoked-write.test.ts`: revoke a project's token, then call `saveAnswers` with that token → returns `{ ok: false, reason: 'revoked' }`; no DB writes occur

### Implementation for User Story 2

- [X] T064 [P] [US2] Author `audit/components/form/FormShell.tsx`: chrome around any active section — top progress bar (X/8 + percentage from `computeCompletionPct`), autosave indicator with three states (`saving | saved | offline`), prev/next buttons, "Sauvegarder & quitter" link
- [X] T065 [US2] Author `audit/components/form/SectionRenderer.tsx`: takes `section: SectionDef` + current answers, iterates fields and dispatches each to its field component via a switch on `field.type`; uses `react-hook-form` `useForm` with `zodResolver`; emits `onAutoSave(partial)` on debounced change
- [X] T066 [P] [US2] Author `audit/components/form/fields/TextField.tsx`, `EmailField.tsx`, `UrlField.tsx`, `NumberField.tsx` — wrappers around `<Input>` adding label, help tooltip, inline error message
- [X] T067 [P] [US2] Author `audit/components/form/fields/SelectField.tsx`, `MultiSelectField.tsx` — wrappers around `<Select>` with options drawn from `FR[fieldId].options`
- [X] T068 [P] [US2] Author `audit/components/form/fields/SliderField.tsx`, `TextareaField.tsx`, `RadioGroupField.tsx`
- [X] T069 [US2] Author `audit/components/form/fields/SystemBlockField.tsx` — composite for Section 2's per-system rows (provider / monthly cost / contract status / satisfaction / frustrations) rendered as a `Card` per system category (PMS, booking engine, channel manager, …)
- [X] T070 [P] [US2] Author `audit/components/form/fields/index.ts` exporting a `FIELD_COMPONENTS: Record<FieldType, FC<FieldProps>>` registry consumed by `SectionRenderer`
- [X] T071 [US2] Author `audit/app/(client)/a/[token]/form/[section]/page.tsx`: validates `[section]` is one of `s1..s8`; loads the project + answers via `loadProjectByToken`; renders `<FormShell><SectionRenderer/></FormShell>`; on `next` from `s8` navigates to `/a/[token]/confirmation` *only* if `submitAudit` succeeds
- [X] T072 [US2] Author `audit/app/(client)/a/[token]/actions.ts` exporting the `saveAnswers(token, partial)` server action per `contracts/client-api.md`: validates the token, validates each `field_id` against `SECTIONS`, validates each value against the field's Zod schema, upserts into `answers` keyed by `(submission_id, field_id)`, recomputes `submissions.completion_pct`, bumps timestamps, transitions status `awaiting → in_progress` on first save, applies the in-memory rate limit (30 calls/min/token)
- [X] T073 [US2] Add `submitAudit(token)` to the same actions file: validates Section 1 required fields are filled (returns `missingRequired: FieldId[]` on failure), sets `projects.status = 'submitted'`, sets `submitted_at` if null, calls `runAllScores(answers)` and upserts `scores`, returns `{ ok: true, submittedAt }`
- [X] T074 [US2] Author `audit/lib/client-form/autosave.ts` (client-side) exporting a `useAutosave(callback, { debounceMs: 1500 })` hook that batches changed-field payloads, queues failed payloads in `localStorage` under `audit:autosave:queue:[token]`, retries with exponential backoff (capped at 30 s), and exposes `state: 'saving' | 'saved' | 'offline'` to the indicator
- [X] T075 [P] [US2] Author `audit/app/(client)/a/[token]/confirmation/page.tsx`: brand-aligned thank-you screen displaying the hotel name and "Votre consultant Rinzler Studio reviendra vers vous sous 48 h"
- [X] T076 [P] [US2] Add a `beforeunload` flush in `useAutosave` that synchronously enqueues any pending payload to the localStorage queue
- [X] T077 [US2] Add a "concurrent edits" guard to `saveAnswers`: include `submissions.updated_at` from the client request; if it doesn't match, return `{ ok: false, reason: 'stale' }` and the form shows the "this assessment was updated in another window — reload?" notice (FR edge case)

**Checkpoint**: User Story 2 functional. The end-to-end client flow (land → fill → autosave → leave → return → submit → confirmation) works.

---

## Phase 5: User Story 3 — Consultant reviews a submission and exports it (Priority: P1)

**Goal**: The consultant opens a submitted project, reads answers grouped by section, appends internal notes, and exports the submission as JSON or a print-ready report.

**Independent Test**: With one submitted project, open `/admin/projects/[id]`. Every answer is visible grouped by the 8 sections. Append a note; reload; the note persists and is never visible from the client URL. Click "Exporter JSON" — file downloads, validates against `contracts/json-export.schema.json`. Open `/admin/projects/[id]/report`, print to PDF — brand-styled and complete.

### Tests for User Story 3

- [ ] T078 [P] [US3] Schema-validation test in `audit/tests/integration/us3-export-schema.test.ts`: build a fully-answered submission fixture, call `buildExport`, assert `ExportV1.safeParse` passes; also assert the resulting JSON validates against `contracts/json-export.schema.json` (load via `ajv`) — covers SC-008
- [ ] T079 [P] [US3] Authorization test in `audit/tests/integration/us3-notes-isolation.test.ts`: append two internal notes to a project; call `loadProjectByToken` for that project's token and assert the returned payload contains zero `internal_notes`; call `buildExport` *without* `includeNotes` and assert `internalNotes` is absent (covers FR-028, SC-007)

### Implementation for User Story 3

- [X] T080 [US3] Author `audit/app/(admin)/projects/[id]/page.tsx`: server component loading the project, all answers, all scores, and all internal notes. Renders a left column of section panels (each `Card` titled with the section name, listing every field's FR label + value formatted by type — empty optionals show "—"); right column shows the `NotesThread` + composer + action buttons (revoke, reopen, mark ongoing, delete, export JSON, view report). On render, calls `bumpLastAdminActivity(projectId)`.
- [X] T081 [P] [US3] Author `audit/components/admin/NotesThread.tsx`: chronological list of internal notes (each: author email, timestamp formatted in Europe/Paris, body); shows "Aucune note interne" empty state
- [X] T082 [P] [US3] Author `audit/components/admin/NoteComposer.tsx`: `<Textarea>` (≤ 5 000 chars, counter near limit) + "Ajouter la note" Button; calls `appendInternalNote` server action; clears on success; preserves draft to `localStorage` keyed by `project:[id]:noteDraft` (FR edge case: session loss mid-compose)
- [X] T083 [US3] Add `appendInternalNote(projectId, body)`, `bumpLastAdminActivity(projectId)`, **and `updateProjectPriority(projectId, priority: 'low'|'medium'|'high')`** to `audit/app/(admin)/projects/actions.ts`: `appendInternalNote` validates `body.length > 0 && body.length <= 5000`, inserts `internal_notes` row, updates `projects.last_admin_activity_at`; `updateProjectPriority` validates the enum, updates `projects.priority` + `last_admin_activity_at`, writes an `audit_log` `project.update_priority` entry — closes FR-026 update path
- [X] T084 [US3] Author `audit/app/(admin)/projects/[id]/export/route.ts`: `requireAdmin()`; reads `?include=notes` query; calls `buildExport(id, { includeNotes })`; sets `Content-Type: application/json` and `Content-Disposition: attachment; filename="audit-<projectId>-<YYYYMMDD>.json"`; writes `audit_log` `project.export_json` entry with `metadata: { includeNotes }`
- [X] T085 [US3] Author `audit/app/(admin)/projects/[id]/report/page.tsx`: brand-aligned print-ready layout — cover header with logo + hotel name + project label + dates; one section per page-break with `@media print` CSS; every answer rendered with FR label + value; scores summary panel with bars; notes section conditional on `?includeNotes=1`. Inline `<style>` block sized to print A4 cleanly.
- [X] T086 [P] [US3] Author `audit/styles/print.css` (loaded only by the report page): hides admin chrome, forces light background for ink, sets page margins, `@page { size: A4 }`

**Checkpoint**: All three P1 user stories functional — V1 launch candidate.

---

## Phase 6: User Story 4 — Scores and dashboard signals (Priority: P2)

**Goal**: Each submitted project shows four readiness scores; the dashboard list is sortable/filterable.

**Independent Test**: Submit three fixture projects of clearly different profiles (one all-modern, one all-legacy, one mid). Dashboard shows differentiated scores. Sorting by any score column reorders the list correctly.

### Tests for User Story 4

- [ ] T087 [P] [US4] Unit tests in `audit/tests/unit/scoring/automation-opportunity.test.ts`, `operational-complexity.test.ts`, `modernization-readiness.test.ts`, `digital-maturity.test.ts`: each covers three fixture answer sets (low / mid / high), asserts deterministic value + band + non-empty `basis` array (FR-031, FR-033)

### Implementation for User Story 4

- [ ] T088 [P] [US4] Author `audit/lib/scoring/automation-opportunity.ts`: pure function reading Section 3 difficulty sliders + count of "manual" answers in Sections 3 & 5 + Section 6 interest; returns `{ value, band, basis }`
- [ ] T089 [P] [US4] Author `audit/lib/scoring/operational-complexity.ts`: counts distinct systems in Section 2 + systems-don't-communicate answer + manual-process count
- [ ] T090 [P] [US4] Author `audit/lib/scoring/modernization-readiness.ts`: weights Section 6 interest signals + Section 7 budget/timeline/resistance (inverse of resistance)
- [ ] T091 [P] [US4] Author `audit/lib/scoring/digital-maturity.ts`: counts modern systems in Section 2 + self-check-in availability + review-management process maturity
- [ ] T092 [US4] Replace the stub in `audit/lib/scoring/index.ts` (`runAllScores`) to invoke the four real scorers and return the upsert payload; ensure `submitAudit` (T073) writes the new scores
- [ ] T093 [US4] Author `audit/components/admin/ScoresBadge.tsx`: pill with name + numeric value + band-colored bar (green/amber/red); used in both the dashboard row and the project detail page
- [ ] T094 [US4] Update `audit/app/(admin)/projects/page.tsx` to render the four `ScoresBadge` components per row when scores exist; add column-header sort controls for `status | priority | completion_pct | last_updated | score:<name>`; persist the chosen sort in `sessionStorage` keyed by `admin:projects:sort` (FR-030)
- [ ] T095 [P] [US4] Update `audit/app/(admin)/projects/[id]/page.tsx` to render a "Scores" panel with the four badges and their `basis` field-id list (explainability hint)

**Checkpoint**: User Story 4 functional. Dashboard provides at-a-glance triage.

---

## Phase 7: User Story 5 — Reopen and edit a submitted assessment (Priority: P3)

**Goal**: An admin can flip a submitted project back to editable; the client URL reactivates with answers preserved; resubmitting bumps `last_edited_at` while preserving `submitted_at`.

**Independent Test**: Open a submitted project, click "Réouvrir pour le client", confirm. The client URL is editable again. Client edits a field, resubmits. `submitted_at` unchanged; `last_edited_at` updated; original answers preserved.

### Tests for User Story 5

- [ ] T096 [P] [US5] Integration test in `audit/tests/integration/us5-reopen.test.ts`: submit → reopen → edit → resubmit; assert `submitted_at` preserved on first submission, `last_edited_at` updated, all original `answers` rows intact

### Implementation for User Story 5

- [X] T097 [US5] Add `reopenProject(projectId)` to `audit/app/(admin)/projects/actions.ts`: sets `projects.status = 'reopened'`, writes `audit_log` `project.reopen` entry
- [X] T098 [P] [US5] Add `markOngoingEngagement(projectId, ongoing)` and `revokeProjectToken(projectId)` and `deleteProject(projectId)` (with confirmation: server-side requires the admin to pass the project label as a confirmation string) to the same actions file; each writes an audit_log entry
- [X] T099 [P] [US5] Update `audit/app/(admin)/projects/[id]/page.tsx` action panel to surface buttons: "Réouvrir", "Marquer engagement actif" (toggle), "Révoquer le lien", "Supprimer" (opens a modal that requires typing the project label)
- [X] T100 [P] [US5] Update `audit/app/(client)/a/[token]/page.tsx` to surface a "Cet audit a été réouvert pour modification" banner when project status is `reopened`

**Checkpoint**: All five user stories functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Compliance plumbing (auto-purge), analytics, accessibility, perf validation, deployment docs, end-to-end golden flows.

### Auto-purge & cron (FR-044b, R11)

- [X] T101 Author `audit/app/api/cron/purge/route.ts`: `POST` handler that checks `req.headers.get('x-cron-secret') === env.CRON_SECRET` (constant-time), reads `?force=1` query, calls `runPurgeSweep`, returns `{ purged: number }`; idempotent if `meta.last_purge_sweep_at` < 24 h ago and `force` is absent; returns 401 without body on missing/wrong secret
- [X] T102 Add an opportunistic purge check at app startup in `audit/lib/db/index.ts`: on first DB client init in a worker, if `meta.last_purge_sweep_at` is > 24 h old, fire-and-forget `runPurgeSweep` (caught + logged)
- [X] T103 [P] Document the o2switch cPanel cron entry in `audit/README.md` deploy section: `15 3 * * * curl -fsS -X POST -H "X-Cron-Secret: $CRON_SECRET" https://audit.rinzlerstudio.com/api/cron/purge`

### Plausible analytics (server-side)

- [X] T104 [P] Author `audit/lib/analytics/plausible.ts` exporting `track(eventName, props?)` that POSTs to `https://plausible.io/api/event` with the project's hashed id (never the plaintext token)
- [X] T105 Wire `track('audit_section_completed', { section_id })` into `saveAnswers` when `completion_pct` first crosses each section's threshold; wire `track('audit_submitted')` into `submitAudit`; wire `track('admin_export_json', { include_notes })` into the export route handler; wire `track('audit_revoked_view')` into the revoked 404 path

### Privacy notice & legal sync (FR-042, FR-044b disclosure)

- [X] T106 [P] Add a privacy-notice block to `audit/app/(client)/a/[token]/page.tsx` and to the form footer: "Vos réponses sont stockées en France (o2switch). Conservation : 36 mois après la dernière activité, conformément aux recommandations CNIL. Un journal interne de traçabilité (qui a fait quoi, et quand) est conservé sans limite de durée pour des raisons de sécurité opérationnelle ; il ne contient aucune réponse client. Politique complète : <link>". Link points to `https://rinzlerstudio.fr/politique-confidentialite.html`. **(The audit-log exemption sentence closes the data-model.md disclosure promise.)**
- [X] T107 [P] Append a section to `src/politique-confidentialite.html` (marketing site) describing the audit platform's data flows: hosting (o2switch FR), retention (36 months CNIL-aligned), categories of data collected, lawful basis (legitimate interest — pre-engagement audit), data subject rights, contact for deletion requests. **This is a constitution-mandated legal sync for any new data collection (Principle I + Workflow § Legal sync).**

### Accessibility & performance

- [ ] T108 [P] Add `prefers-reduced-motion` queries to `audit/app/globals.css` zeroing out section transitions; verify `<HelpTooltip>` is keyboard-reachable (focusable trigger, `aria-describedby` linking to tooltip body) — covers FR-039 + accessibility baseline. **Add a unit test `audit/tests/unit/transitions.test.ts` that scans all component CSS files and asserts every `transition` declaration uses one of the brand tokens `--transition-fast | --transition-normal` (≤ 300 ms / 250 ms perceived) — fails the build if a longer literal duration leaks in.**
- [ ] T109 [P] Run Lighthouse on the client form landing in dev (`npm run build && npm run start`); confirm LCP < 2.5 s on the throttled 4G profile and total client-form JS < 200 KB gzipped per the audit-app sub-stack budget; document results in `audit/docs/perf.md` with the `lighthouse` JSON output committed
- [ ] T110 [P] Add a manual a11y pass: tab through Section 1 with the keyboard, verify visible focus rings on every input/Button, run axe-core via `@axe-core/playwright` over the landing + first form section in `audit/tests/e2e/a11y.spec.ts` (warns only)

### End-to-end golden flows (Playwright)

- [ ] T111 [P] Author `audit/tests/e2e/client-flow.spec.ts` covering the quickstart manual smoke test: seed DB → admin creates a project with pre-fill → open token URL in a new context → walk Sections 1→8 (filling representative fields) → assert autosave indicator transitions saving→saved → reload mid-form, assert prior answers restored → submit → confirmation page → in the admin context, assert status `Submitted` and completion 100%
- [ ] T111a [P] Author `audit/tests/e2e/responsive.spec.ts` running an abbreviated client form walk-through at four viewports (360 × 740, 768 × 1024, 1280 × 800, 1920 × 1080) and asserting on each: no horizontal scrollbar (`document.documentElement.scrollWidth <= clientWidth`), all primary CTAs are visible without scroll on the section landing, and the operational-difficulty slider degrades to numeric input at 360 px — closes FR-012 / FR-040 / SC-005 verification
- [ ] T112 [P] Author `audit/tests/e2e/admin-flow.spec.ts`: sign-in → list page → open a submitted project → append a note (assert it persists across reload) → click Export JSON (assert file downloads, validate against `contracts/json-export.schema.json`) → open report view (assert print CSS applied, all 8 sections rendered)
- [ ] T113 [P] Author `audit/tests/e2e/security.spec.ts` covering SC-007: anonymous GET to `/admin/projects` redirects to login; GET `/a/<random-base64url>` returns the same generic 404 as a known revoked token; client export URL guess (`/admin/projects/[id]/export`) without session returns 307 to login

### Deployment & docs

- [X] T114 [P] Author `audit/README.md`: quickstart from the spec quickstart.md (local dev, env vars, DB setup, seeding), production build for o2switch (Node Selector setup, `output: 'standalone'`, `node .next/standalone/server.js` startup file, port binding, AutoSSL on the `audit.rinzlerstudio.com` subdomain), the cron entry from T103, troubleshooting (`better-sqlite3` rebuild on cPanel)
- [X] T115 [P] Add a top-level repo `README.md` (currently absent) listing both apps: marketing site at `src/` (Vite, deployed to `rinzlerstudio.fr`) + audit platform at `audit/` (Next.js, deployed to `audit.rinzlerstudio.com`), each with a one-line "what" and a link to the app's own README. Resolves the constitution v1.1.0 follow-up TODO.

### Final validation

- [ ] T116 Run the full quickstart manual smoke test (`specs/001-hotel-audit-platform/quickstart.md` § Manual smoke test) end-to-end on a fresh checkout; document any deviations in `audit/docs/v1-launch-notes.md`. **While running the smoke test, time two operations with a stopwatch and record them in the launch notes: (a) admin creates a new project + obtains a copyable URL — target ≤ 3 min for SC-001; (b) admin opens a submitted project, adds a note, and exports JSON — target ≤ 2 min for SC-004. Note any miss with a one-line cause analysis.**
- [ ] T117 Re-validate constitution check against v1.1.0 (Principles I–V + audit-platform sub-stack) and confirm no Complexity Tracking items remain unjustified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. **Blocks all user stories.**
- **Phase 3 (US1, P1)**: Depends on Phase 2.
- **Phase 4 (US2, P1)**: Depends on Phase 2 and on US1's `loadProjectByToken` (T058) being available.
- **Phase 5 (US3, P1)**: Depends on Phase 2 and on US2's `submitAudit` action (T073) producing a submission with scored stubs.
- **Phase 6 (US4, P2)**: Depends on Phase 2 and on US3's project detail page (T080) being in place to surface the score badges.
- **Phase 7 (US5, P3)**: Depends on Phase 2 and on US3's project detail page (T080) for the action buttons.
- **Phase 8 (Polish)**: Depends on whichever user stories are in scope for the launch (US1+US2+US3 minimum for V1).

### User Story Dependencies (cross-story)

- **US1 (P1)**: Standalone after Phase 2.
- **US2 (P1)**: Needs `loadProjectByToken` from US1 (T058) — soft dependency; could be stubbed if working in parallel.
- **US3 (P1)**: Needs a submitted project to exist; can fixture one via integration tests independently of US2's UI.
- **US4 (P2)**: Independent of US5; needs US3's detail page to host score badges.
- **US5 (P3)**: Independent of US4; needs US3's detail page to host action buttons.

### Within Each User Story

- Tests written first for security/authorization paths (US1, US3) and schema-validation paths (US3) — they MUST FAIL on first run.
- Models / lib modules → server actions → routes / pages → components.
- Story complete (independent test passes) before moving to next.

### Parallel Opportunities

- **Phase 1**: T004, T005, T006 in parallel; T007/T008 in parallel (different files).
- **Phase 2**: All UI primitives (T035–T042) in parallel; all schema lib modules (T021–T024) in parallel; all test scaffolds (T046–T050) in parallel.
- **Phase 3**: T051, T052 (tests) in parallel; T055, T058 (different files) in parallel.
- **Phase 4**: All field components (T066–T070) in parallel; tests (T061–T063) in parallel.
- **Phase 6**: All four scorers (T088–T091) in parallel.
- **Cross-story**: Once Phase 2 is done, a 2-developer team can split US1+US3 (admin) from US2 (client form) and converge on US4/US5 afterward.

---

## Parallel Example: Phase 2 UI primitives

```bash
# All can run concurrently — each touches a different file:
Task: "Author audit/components/ui/Button.tsx (T035)"
Task: "Author audit/components/ui/Card.tsx (T036)"
Task: "Author audit/components/ui/Input.tsx + Textarea.tsx + Select.tsx (T037)"
Task: "Author audit/components/ui/Slider.tsx (T038)"
Task: "Author audit/components/ui/RadioGroup.tsx (T039)"
Task: "Author audit/components/form/HelpTooltip.tsx (T040)"
Task: "Author audit/components/brand/Logo.tsx + GradientText.tsx + GlassPanel.tsx (T041)"
Task: "Author audit/components/ui/ThemeToggle.tsx (T042)"
```

## Parallel Example: Phase 6 scoring

```bash
# Four pure-function scorers, four files:
Task: "Implement automation-opportunity scorer (T088)"
Task: "Implement operational-complexity scorer (T089)"
Task: "Implement modernization-readiness scorer (T090)"
Task: "Implement digital-maturity scorer (T091)"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — V1 launch)

All three are P1 and jointly required for any value:

1. Phase 1 Setup (T001–T013)
2. Phase 2 Foundational (T014–T050)
3. Phase 3 US1 Admin creates engagement (T051–T060)
4. Phase 4 US2 Client completes audit (T061–T077)
5. Phase 5 US3 Consultant reviews & exports (T078–T086)
6. Phase 8 essentials only: T101–T103 (auto-purge), T105 (analytics events), T106–T107 (privacy notice + legal sync), T111–T113 (golden E2E), T114–T115 (deployment docs), T116–T117 (final validation)

**STOP and VALIDATE**: Run quickstart manual smoke test. Deploy to `audit.rinzlerstudio.com`.

### V1.1 increments (post-launch)

- Add US4 (Phase 6) — scoring + dashboard sort/filter.
- Add US5 (Phase 7) — reopen, mark ongoing, delete.
- Add T108–T110 (a11y / perf instrumentation).

### Parallel team strategy (2 devs)

Once Phase 2 completes:

- **Dev A**: US1 (Phase 3) → US3 (Phase 5) → US4 (Phase 6) → US5 (Phase 7) → polish
- **Dev B**: US2 (Phase 4) → polish (auto-purge, analytics, perf, E2E)

Stories can integrate at the foundational seams (`loadProjectByToken`,
`saveAnswers`, the project detail page) without breaking story independence.

---

## Notes

- `[P]` tasks touch different files and have no dependencies on incomplete tasks in the same phase.
- `[Story]` label maps each user-story task to its `US#` for traceability.
- The five P1/P2/P3 priorities encode launch order, not strict blocking — US1+US2+US3 must all be done for the V1 launch demo.
- Verify security/authorization tests (T051, T079, T113) FAIL before implementation — they encode the SC-007 invariant.
- Commit after each task or each tightly-grouped subset (e.g. all field components together).
- Stop at any **Checkpoint** to validate the story independently before moving on.
- Avoid: skipping the legal-sync task (T107) — it's a Principle I (RGPD) compliance gate, not optional polish.
