---
description: "Task list for feature 003-hotel-diagnostic-platform implementation"
---

# Tasks: Hotel Diagnostic Platform

**Input**: Design documents from `/specs/003-hotel-diagnostic-platform/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Test tasks are included because the spec uses measurable acceptance criteria (20 SCs), the existing `audit/` codebase has an established Vitest + Playwright suite, and the platform handles privacy-sensitive flows where regressions are unacceptable. Contract tests and key E2E tests are required; exhaustive unit-test coverage is left to per-task author discretion.

**Organization**: Tasks are grouped by user story so each story can be implemented and deployed independently after the foundational phase completes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable — different files, no dependency on incomplete tasks.
- **[Story]**: user-story label (US1 … US14). Setup, foundational, and polish phases have no story label.
- Every task gives the exact file path to create or edit.

## Path Conventions

This feature is implemented in-place inside `audit/` (the existing Next.js application). Paths are repo-root-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the new dependencies, dev containers, and migration scaffolding.

- [X] T001 Update `audit/package.json` dependencies — add `@aws-sdk/client-bedrock-runtime`, `@deepgram/sdk`, `playwright` (server use), `lighthouse`, `cheerio`, `bullmq`, `ioredis`, `pg`, `pdfkit`, `@aws-sdk/client-s3`, `testcontainers`; remove `mysql2` after migration completes (T009 / Phase 18).
- [X] T002 [P] Create `audit/infra/dev/docker-compose.yml` with `postgres:16`, `redis:7`, `minio` services per [quickstart.md](./quickstart.md) §2.
- [X] T003 [P] Update `audit/drizzle.config.ts` — switch dialect to `postgresql`, point to `DATABASE_URL`.
- [X] T004 [P] Update `audit/.env.example` — add `BEDROCK_REGION`, `BEDROCK_MODEL_ID_OPUS`, `BEDROCK_MODEL_ID_SONNET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DEEPGRAM_API_KEY`, `DEEPGRAM_REGION`, `REDIS_URL`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `AI_PER_PROJECT_BUDGET_EUR`.
- [X] T005 Write `audit/scripts/migrate-mysql-to-postgres.ts` — read from `MYSQL_URL`, write to `DATABASE_URL`, validate per-table checksums, idempotent.
- [X] T006 Update `audit/lib/db/index.ts` (and `audit/db/index.ts` if separate) to use the `pg` driver via Drizzle's `node-postgres` adapter; remove `mysql2` connection plumbing.
- [X] T007 [P] Create `audit/workers/run.ts` — single entry script that loads all queue handlers; add `pnpm workers:dev` to `package.json` scripts.
- [X] T008 [P] Update `audit/eslint.config.mjs` to include new `audit/workers/` and `audit/lib/{scanner,ai,transcribe,recommend,governance,enrichment,learning,compliance,funding,report,questionnaire}/` paths.
- [X] T009 Update `audit/package.json` scripts — add `workers:dev`, `db:seed:vendors`, `db:seed:questionnaire`, `db:migrate:mysql-to-postgres`, `test:contract`; ensure existing `test`, `test:e2e`, `typecheck`, `lint` still pass.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, auth extension, queue runtime, governance primitives, and PII protections that every user story depends on.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete. The schema below is the single source of truth.

### Database schema (parallel — different table groups in separate Drizzle files)

- [X] T010 [P] Define identity + project schema in `audit/db/schema/identity.ts`: `hotels`, extend `projects` (add `hotel_id`, `tier`, `goal_primary`, `goal_secondary`, `budget_level`, `purge_after`), rename `admins` → `users`, add `user_roles`, extend `internal_notes` with `target_type` + `target_id`, extend `audit_log` action enum per [data-model.md](./data-model.md) §K.
- [X] T011 [P] Define scanner schema in `audit/db/schema/scanner.ts`: `scans`, `scan_findings`.
- [X] T012 [P] Define questionnaire schema in `audit/db/schema/questionnaire.ts`: `questions`, `question_versions`, `question_translations`, `question_conditions`.
- [X] T013 [P] Define answers + voice schema in `audit/db/schema/answers.ts`: extend `answers` (add `question_version_id`, `source`, `confidence`, `overrides_answer_id`), add `voice_captures`.
- [X] T014 [P] Define vendor schema in `audit/db/schema/vendor.ts`: `vendors`, `vendor_versions`, `vendor_translations`, `provenance_records`.
- [X] T015 [P] Define recommendation schema in `audit/db/schema/recommendation.ts`: `scenarios`, `recommendations`, `readiness_scores`, `roadmap_items`, `compliance_findings`, `funding_briefs`.
- [X] T016 [P] Define report-snapshot schema in `audit/db/schema/report.ts`: `report_snapshots`.
- [X] T017 [P] Define knowledge/learning schema in `audit/db/schema/knowledge.ts`: `candidate_enrichments`, `learned_patterns`, and the `mv_audit_segment_outcomes` materialized view definition.
- [X] T018 [P] Define implementation + integration schema in `audit/db/schema/implementation.ts`: `knowledge_base_entries`, `implementation_steps`, `performance_metrics`, `integration_workflows`.
- [ ] T019 BLOCKED — needs running Postgres. Re-export the union schema from `audit/db/schema.ts`; generate the initial migration with `pnpm db:generate`; commit migration SQL under `audit/db/migrations/`. (Union re-export is already in place at `audit/db/schema.ts`; `pnpm db:generate` cannot run without `DATABASE_URL`.)

### Auth & governance primitives

- [ ] T020 BLOCKED — needs feature-001 auth wiring. `audit/lib/auth/options.ts` and `audit/lib/auth/config.ts` are not present in the worktree; the `audit/app/api/auth/[...nextauth]/route.ts` route imports a missing module. NextAuth role-callbacks extension is unblocked once feature-001's auth options module lands. (Public free-scan flow does not need auth.)
- [X] T021 [P] Create `audit/lib/auth/roles.ts` — `requireAnyRole(session, roles)`, `hasRole(session, role)`, `effectiveScopes(session)` helpers (per [contracts/admin-server-actions.md](./contracts/admin-server-actions.md) capability matrix).
- [X] T022 [P] Extend `audit/lib/audit-log/index.ts` — add the new action enum values from [data-model.md](./data-model.md) §K; add the deletion-scrub helper for the FR-166 carve-out.
- [X] T023 [P] Create `audit/lib/governance/provenance.ts` — read/write `provenance_records`, freshness window check, conflict surfacing helpers (FR-110, FR-111, FR-112).
- [X] T024 [P] Create `audit/lib/ai/redact.ts` — server-side PII redactor (R9): name, email, phone, IBAN, PAN, French national-ID-like patterns, named guests; returns `{ redactedPayload, categoriesMatched }`.

### AI + transcription + workers + storage primitives

- [X] T025 [P] Create `audit/lib/ai/bedrock-client.ts` — Bedrock adapter (`eu-central-1`), prompt-cache wrapper, structured-output validation, per-project budget guard, fallback to rules-only when budget exceeded.
- [X] T026 [P] Create `audit/lib/transcribe/deepgram.ts` — issue 60-second WebSocket session tokens scoped to streaming-only with `keep_audio=false`.
- [X] T027 [P] Create `audit/workers/lib/queue.ts` — BullMQ queue/worker factory, per-queue concurrency caps and rate limiters per [contracts/worker-jobs.md](./contracts/worker-jobs.md).
- [X] T028 [P] Create `audit/lib/storage/s3.ts` — Scaleway-compatible client (MinIO locally), signed-URL issuance for PDFs.
- [X] T029 [P] Setup Sentry EU integration in `audit/lib/observability/sentry.ts` (Next.js + workers) — no PII in logs.
- [X] T030 [P] Setup OpenTelemetry tracing in `audit/lib/observability/otel.ts` for worker jobs.

### Cross-cutting workers + middleware

- [X] T031 Implement `audit/workers/purge.worker.ts` — daily sweep of `free_scan` projects past `purge_after`; processes hotelier-deletion requests; cascades per [contracts/admin-server-actions.md](./contracts/admin-server-actions.md) `executeHotelierDeletion`.
- [X] T032 Extend `audit/middleware.ts` — let `/` and `/scan/*` pass through indexable; keep `/a/*` (tokenized client) and `/admin/*` `noindex`.

**Checkpoint**: Foundation ready. All user-story work can now begin in parallel.

---

## Phase 3: User Story 1 — Automated External Diagnostic (Priority: P1) 🎯 MVP

**Goal**: A visitor enters only a URL and receives a structured plain-language diagnostic with concrete observations and quick wins, without creating an account.

**Independent Test**: From the public landing page, submit a hotel URL; within 2 minutes the result page renders ≥ 10 plain-language observations across the documented categories, with an upgrade CTA and an optional email opt-in that does not gate the content (SC-001, SC-002, FR-008, FR-009).

### Implementation for User Story 1

- [X] T033 [P] [US1] Create vendor fingerprint definitions in `audit/lib/scanner/fingerprints/` — one file per category (booking-engine, PMS, channel-manager, CRM, guest-messaging), each exporting a list of `{ vendor_slug, script_patterns, iframe_patterns, url_patterns, confidence }`.
- [X] T034 [P] [US1] Create `audit/lib/scanner/lighthouse-runner.ts` — drives Lighthouse via the Playwright CDP session; returns performance, accessibility, best-practices, SEO category scores.
- [X] T035 [P] [US1] Create `audit/lib/scanner/dom-extractors.ts` — extracts schema.org JSON-LD via Cheerio, FAQ heuristic, WhatsApp `wa.me` links, hreflang map, OG tags, contact-page detection, booking-button target.
- [X] T036 [P] [US1] Create `audit/lib/scanner/finding-mappers.ts` — maps raw observations into `scan_findings` rows with `field`, `value_json`, `evidence`, `confidence`.
- [X] T037 [US1] Create `audit/lib/scanner/scan-runner.ts` — orchestrates one scan: open Playwright context, run desktop pass, run mobile pass, run Lighthouse, run fingerprinting, write findings (depends on T033, T034, T035, T036).
- [X] T038 [US1] Implement `audit/workers/scan.worker.ts` — BullMQ `scan.run` job per [contracts/worker-jobs.md](./contracts/worker-jobs.md); concurrency 4; handles blocked / unreachable / non-hotel error classes.
- [X] T039 [US1] Implement `audit/app/api/scan/start/route.ts` — POST endpoint; normalizes URL; per-IP rate-limit (5/hour); checks fresh-cache reuse; enqueues scan job; returns `scan_id`.
- [X] T040 [US1] Implement `audit/app/api/scan/[scanId]/status/route.ts` — GET polling endpoint.
- [X] T041 [US1] Implement public free-scan landing at `audit/app/(public)/page.tsx` — single primary action (URL form), per-page SEO metadata, structured data (`WebApplication`, `Service`).
- [X] T042 [US1] Implement free-scan result page at `audit/app/(public)/scan/[scanId]/page.tsx` — renders observations, opportunity map, detected vendors, optional email opt-in, upgrade CTA.
- [X] T043 [US1] Implement `getPublicScanResult(scanId)` server action in `audit/lib/scanner/get-public-result.ts`.
- [X] T044 [US1] Implement `optInToEmail(scanId, email, consent)` server action in `audit/lib/scanner/email-opt-in.ts` — requires explicit consent flag; never degrades the visible scan output.
- [X] T045 [P] [US1] Create `audit/components/scan-result/` — `ObservationCard`, `OpportunityMap`, `DetectedVendorList`, `EmailOptInForm`, `UpgradeCta` components consuming the shared token system.
- [X] T046 [US1] Wire Plausible events in `audit/lib/analytics/events.ts` — `scan_started`, `scan_completed`, `scan_email_opt_in`, `scan_completed_viewed`.

### Tests for User Story 1

- [X] T047 [P] [US1] Contract test: scan/start happy path + dedup in `audit/tests/contract/scan-start.spec.ts`.
- [X] T048 [P] [US1] Contract test: scan/start with invalid URL, rate-limit hit, RFC1918 input in `audit/tests/contract/scan-start-rejections.spec.ts`.
- [X] T049 [P] [US1] E2E test: free-scan happy path with no email + path with optional email in `audit/tests/e2e/free-scan.spec.ts` — asserts ≥ 10 observations rendered and visible-without-account (SC-001, FR-008). (E2E test self-skips when scan stack is unavailable.)

**Checkpoint**: US1 fully functional and independently testable. This is the MVP slice.

---

## Phase 4: User Story 2 — Dynamic Adaptive Questionnaire (Priority: P1)

**Goal**: A hotelier completes a guided diagnostic where questions branch on prior answers, scan findings, profile, goals, and stack; uses voice for paragraph answers; "I don't know" is always accepted; progress survives session interruption.

**Independent Test**: Run a session that materially changes profile/goal/stack and verify (a) later blocks adapt, (b) voice path uses Deepgram WebSocket with no audio persisted, (c) `commitAnswer` accepts "I don't know" and lowers downstream confidence, (d) reopening the session restores state (SC-003, SC-004, FR-013, FR-018).

### Implementation for User Story 2

- [ ] T050 [P] [US2] Create `audit/lib/questionnaire/condition-evaluator.ts` — evaluates `question_conditions.expression_json` against current answers + scan findings; pure, side-effect-free.
- [ ] T051 [P] [US2] Create `audit/lib/questionnaire/schema-builder.ts` — converts question + version + translation rows into a runtime Zod schema for the current block.
- [ ] T052 [P] [US2] Create `audit/lib/questionnaire/prefill.ts` — pre-fills answers from scan findings and admin pre-fills, returns `prefilled[]` for FR-016 attribution.
- [ ] T053 [US2] Implement `getProjectContext` + `getNextQuestionBlock` server actions in `audit/lib/questionnaire/server-actions.ts`.
- [ ] T054 [US2] Implement `commitAnswer` server action in `audit/lib/questionnaire/commit.ts` — server-side re-validate, write `answers` + optional `voice_captures`, run T024 redactor over voice transcripts, update `submissions.completion_pct`.
- [ ] T055 [US2] Implement `submitAudit` server action — enqueues `ai.reason_project` and `enrichment.extract_from_audit`; sets `projects.status = 'submitted'`.
- [ ] T056 [US2] Implement `getReportStatus` polling server action.
- [ ] T057 [P] [US2] Create `audit/components/questionnaire/` — `BlockShell` (progress + navigation + fallback-language indicator), `FieldRenderer` (dispatches by `answer_type`), one component per type: `SingleChoice`, `MultiSelect`, `Dropdown`, `Slider`, `Ranking`, `YesNoUnknown`, `ShortText`, `VoiceCapture` (T061).
- [ ] T058 [US2] Implement tokenized client questionnaire route at `audit/app/(client)/a/[token]/audit/[blockId]/page.tsx`.
- [ ] T059 [US2] Implement `audit/app/api/transcribe/session/route.ts` — issues Deepgram session tokens with 60-second TTL; project-token-authenticated.
- [ ] T060 [P] [US2] Create `audit/lib/transcribe/client-bridge.ts` — TypeScript helper that opens the Deepgram WebSocket directly from the browser (audio never traverses our server).
- [ ] T061 [P] [US2] Create `audit/components/voice/VoiceCapture.tsx` — streams to Deepgram, displays live transcript, requires hotelier confirmation before commit, exposes "discard" and "re-record" actions.
- [ ] T062 [US2] Implement `audit/workers/ai.worker.ts` — initial handler for `ai.extract_voice_structure` job per [contracts/ai-prompts.md](./contracts/ai-prompts.md) P2 (depends on T024, T025).
- [ ] T063 [US2] Wire Plausible events: `audit_started`, `audit_section_progressed`, `audit_voice_used`, `audit_submitted` (extend T046's events module).

### Tests for User Story 2

- [ ] T064 [P] [US2] Contract test: conditional rendering — hotel profile + goal selections change which question_versions are returned, in `audit/tests/contract/questionnaire-branching.spec.ts`.
- [ ] T065 [P] [US2] Contract test: `commitAnswer` with voice payload writes `voice_captures` and never persists audio, in `audit/tests/contract/commit-voice.spec.ts`.
- [ ] T066 [P] [US2] Contract test: "I don't know" answer accepted, downstream confidence lowered (FR-018), in `audit/tests/contract/idk-confidence.spec.ts`.
- [ ] T067 [P] [US2] E2E test: full questionnaire path with goal switching + voice usage in `audit/tests/e2e/questionnaire.spec.ts`.

**Checkpoint**: US1 + US2 functional. Hotelier can scan, then complete an adaptive guided audit.

---

## Phase 5: User Story 3 — Decision-Support Output (Priority: P1)

**Goal**: After submission, a structured report renders: exec summary, readiness scores, opportunity map, bottleneck analysis, scenarios, tool shortlist, "what not to do now," impact analysis, 30/60/90-day roadmap, compliance findings, next steps. Every recommendation is explained, has alternatives, a do-nothing consequence, and a confidence; every recommendation enumerates the signals that informed it; the report is immutable post-publish.

**Independent Test**: Submit a full-tier audit; report renders within 90s containing all 11 documented sections; every recommendation carries the required fields; running the same hotel with different budget/goal selections produces visibly different reports; once published, subsequent vendor/question/scoring changes do not alter the rendered report (SC-006, SC-007, SC-010, SC-013, SC-020).

### Implementation for User Story 3

- [ ] T068 [P] [US3] Create rule files in `audit/lib/recommend/rules/`: `eligibility.ts` (vendor-vs-profile match), `exclusions.ts` (when-not-to-recommend), `do-not-do-now.ts` (premature actions), `scoring-contributions.ts` (per-dimension weights).
- [ ] T069 [P] [US3] Create `audit/lib/recommend/score-calculator.ts` — computes 9 readiness scores with `basis_json` per FR-037.
- [ ] T070 [P] [US3] Create `audit/lib/recommend/scenario-builder.ts` — groups recommendations into minimal/balanced/advanced scenarios with explicit trade-offs.
- [ ] T071 [P] [US3] Create `audit/lib/recommend/impact-estimator.ts` — qualitative impact across the 13 dimensions in FR-040.
- [ ] T072 [P] [US3] Create `audit/lib/recommend/roadmap-generator.ts` — buckets recommendations into immediate / 30d / 60d / 90d / postponed / not_now with effort, impact, dependencies, decision points.
- [ ] T073 [US3] Create `audit/lib/ai/prompts/reason-project.ts` — system message + tool definition per [contracts/ai-prompts.md](./contracts/ai-prompts.md) P1; mark stable prefix sections for prompt caching.
- [ ] T074 [US3] Extend `audit/workers/ai.worker.ts` — implement `ai.reason_project` job: load context, redact, call Bedrock, validate tool output, intersect `signals_consulted` with rules-derived enumeration, persist `scenarios` + `recommendations` + `readiness_scores` (depends on T024, T025, T068–T072, T073).
- [ ] T075 [US3] Implement `audit/lib/report/snapshot-builder.ts` — assemble `report_snapshots.rendered_json` conforming to [contracts/report-export.schema.json](./contracts/report-export.schema.json); pin participating vendor/question/rule versions.
- [ ] T076 [US3] Implement `audit/lib/report/publish.ts` — atomic write of `report_snapshots` + enqueue `report.pdf` job; emits `report_published` event.
- [ ] T077 [US3] Implement `audit/workers/report.worker.ts` — renders snapshot to paginated PDF via `pdfkit`, uploads to S3 with `reports/{project_id}/{snapshot_id}.pdf` key.
- [ ] T078 [US3] Implement `getPublishedReport` server action.
- [ ] T079 [US3] Implement client report page at `audit/app/(client)/a/[token]/report/page.tsx`.
- [ ] T080 [P] [US3] Create `audit/components/report/` — `ExecutiveSummary`, `ScoreGrid` (9 dimensions), `OpportunityMap`, `BottleneckAnalysis`, `ToolStackOverview`, `ScenarioComparison`, `RecommendationCard` (with explanation accordion, alternatives, do-nothing consequence, confidence chip), `WhatNotToDoNow`, `ImpactTable`, `RoadmapBoard` (30/60/90), `ComplianceChecklist`, `NextSteps`.
- [ ] T081 [US3] Wire Plausible events: `report_generated`, `report_published`, `report_exported`, `scenario_compared`, `recommendation_inspected`.

### Tests for User Story 3

- [ ] T082 [P] [US3] Contract test: `ai.reason_project` structured-output schema validation in `audit/tests/contract/ai-reason-schema.spec.ts`.
- [ ] T083 [P] [US3] Contract test: `report-export.schema.json` conformance for a synthetic project in `audit/tests/contract/report-schema.spec.ts`.
- [ ] T084 [P] [US3] Contract test: snapshot immutability — vendor edit after publish does NOT change rendered report (SC-020) in `audit/tests/contract/snapshot-immutability.spec.ts`.
- [ ] T085 [P] [US3] Contract test: same hotel with different budget/goal produces materially different reports (SC-013) in `audit/tests/contract/budget-goal-variance.spec.ts`.
- [ ] T086 [P] [US3] E2E test: submit → report renders within 90s with all 11 sections, "What not to do now" non-empty (SC-007), in `audit/tests/e2e/report-render.spec.ts`.

**Checkpoint**: US1 + US2 + US3 deliver the full self-service flow.

---

## Phase 6: User Story 4 — Consultant-Assisted Session (Priority: P1)

**Goal**: A consultant overlays a workspace on any project — reads scan + answers + reasoning, overrides answers with attribution, suppresses or boosts recommendation lines, leaves private notes, publishes a curated client-facing report that excludes internal content.

**Independent Test**: Consultant overrides budget on a project; report recomputes; client view shows the new report but no internal notes or override reasons (SC-017).

### Implementation for User Story 4

- [ ] T087 [P] [US4] Create `audit/lib/consultant/override.ts` — `applyConsultantOverride(projectId, questionSlug, value, reason)` preserves the original client answer via `overrides_answer_id`; enqueues partial recompute.
- [ ] T088 [P] [US4] Create `audit/lib/consultant/scenario-weights.ts` — `adjustScenarioWeights(projectId, scenarioId, adjustments)` with private justification note.
- [ ] T089 [US4] Implement `publishConsultantReport` server action — strips `internal_notes`, override reasons, raw weights from the rendered snapshot before write (FR-072, SC-017).
- [ ] T090 [US4] Implement consultant workspace page at `audit/app/admin/consultant/[projectId]/page.tsx` — left pane: scan + answers, right pane: recommendation reasoning with override controls and internal-note thread.
- [ ] T091 [P] [US4] Create `audit/components/consultant/` — `WorkspaceOverlay`, `OverrideControl` (shows original answer alongside override), `InternalNotePane`, `ScenarioSideBySide`, `ConsultantConfidenceWidget`.
- [ ] T092 [US4] Extend `audit/lib/audit-log/` — emit `consultant_override_applied` events with the override target and (private) reason.

### Tests for User Story 4

- [ ] T093 [P] [US4] Contract test: `publishConsultantReport` snapshot contains no `internal_notes` content (SC-017) in `audit/tests/contract/consultant-publish-strip.spec.ts`.
- [ ] T094 [P] [US4] E2E test: consultant overrides budget, report recomputes, client incognito view excludes the private note in `audit/tests/e2e/consultant-flow.spec.ts`.

---

## Phase 7: User Story 5 — Vendor Database Management (Priority: P1)

**Goal**: The team curates vendor entries through an admin interface with per-field source attribution, versioning, retirement, and filtering.

**Independent Test**: Add a vendor matching a hotel profile; the next audit lists the vendor with explanation referencing populated fields. Edit the entry; new audit reflects the change while past published reports continue to reference the old version (FR-023, FR-094).

### Implementation for User Story 5

- [ ] T095 [P] [US5] Implement `createVendor` + `updateVendor` + `retireVendor` server actions in `audit/lib/vendor/admin-actions.ts` — each update writes a new `vendor_versions` row and per-field `provenance_records`.
- [ ] T096 [P] [US5] Implement `filterVendors` + `compareVendorsSideBySide` server actions.
- [ ] T097 [US5] Implement vendor list page at `audit/app/admin/vendors/page.tsx` with category + tag + freshness filters.
- [ ] T098 [US5] Implement vendor editor at `audit/app/admin/vendors/[vendorId]/edit/page.tsx` with per-field provenance UI (source dropdown, last-verified field, confidence chip).
- [ ] T099 [P] [US5] Create `audit/components/vendor/` — `VendorCard`, `SourceLabelChip`, `FreshnessIndicator`, `SideBySideComparison`, `ConflictBanner`.
- [ ] T100 [US5] Implement `audit/scripts/seed-vendor-db.ts` — bootstrap ~50 entries from `db_hotels/` CSVs and a curated YAML at `audit/data/vendors-seed.yaml`.

### Tests for User Story 5

- [ ] T101 [P] [US5] Contract test: vendor versioning preserves history (FR-023) in `audit/tests/contract/vendor-versioning.spec.ts`.
- [ ] T102 [P] [US5] Contract test: retired vendor absent from new shortlists, present in past snapshots in `audit/tests/contract/vendor-retirement.spec.ts`.

---

## Phase 8: User Story 6 — Questionnaire Management & Evolution (Priority: P1)

**Goal**: The team manages questions as living content (add, edit, deactivate, version, translate, condition-build) through an admin UI; historical audits remain interpretable against their pinned versions.

**Independent Test**: Add a conditional question, attach it to a goal + score, publish, run a synthetic audit — the question appears under matched conditions, contributes to the score, falls back to canonical FR with a visible indicator when a translation is missing (FR-103, FR-104, SC-014).

### Implementation for User Story 6

- [ ] T103 [P] [US6] Implement `createQuestion` + `updateQuestion` + `publishQuestionVersion` + `deactivateQuestion` server actions in `audit/lib/questionnaire/admin-actions.ts` — every update writes a new `question_versions` row.
- [ ] T104 [P] [US6] Implement `previewQuestionnaire` server action — simulates an audit path without persistence or analytics.
- [ ] T105 [US6] Implement questionnaire list page at `audit/app/admin/questionnaire/page.tsx` with block + status filters.
- [ ] T106 [US6] Implement question editor at `audit/app/admin/questionnaire/[questionId]/edit/page.tsx` with condition builder, scoring-contribution editor, translation tabs.
- [ ] T107 [P] [US6] Create `audit/components/questionnaire-admin/` — `ConditionBuilder` (AST editor for `expression_json`), `ScoringContributionEditor`, `TranslationTabs`, `StagingPreview`.
- [ ] T108 [US6] Implement `audit/scripts/seed-questionnaire.ts` — imports the 22-block questionnaire from spec §22 into DB with default conditional logic and FR translations.

### Tests for User Story 6

- [ ] T109 [P] [US6] Contract test: deactivated question hidden from new audits but visible in past reports (FR-103) in `audit/tests/contract/question-deactivation.spec.ts`.
- [ ] T110 [P] [US6] Contract test: translation fallback shows visible indicator (FR-104) in `audit/tests/contract/translation-fallback.spec.ts`.
- [ ] T111 [P] [US6] Contract test: question wording preservation across version changes (SC-014) in `audit/tests/contract/question-version-pinning.spec.ts`.

---

## Phase 9: User Story 7 — Compliance & Risk Assessment Layer (Priority: P2)

**Goal**: Every audit produces a compliance section with risk areas explained in plain language and a practical checklist; unknown vendor compliance posture reduces recommendation confidence.

**Independent Test**: Hotel declares it uses AI without transparency notice and no DPA — the report's compliance section flags both with checklist items; any AI-related recommendation has its confidence reduced (FR-053).

### Implementation for User Story 7

- [ ] T112 [P] [US7] Create `audit/lib/compliance/findings-library.ts` — curated risk patterns: AI transparency, DPA missing, EU hosting unknown, consent management, retention unclear, AI human-escalation, internal AI policy, etc.; each with explanation + checklist item text in FR + EN.
- [ ] T113 [P] [US7] Create `audit/lib/compliance/evaluator.ts` — maps project state (answers + vendor postures) into `compliance_findings` rows.
- [ ] T114 [US7] Integrate compliance findings into `ai.reason_project` (extend T074) and into the report snapshot.

### Tests for User Story 7

- [ ] T115 [P] [US7] Contract test: AI-tool-without-transparency-notice produces the expected finding in `audit/tests/contract/compliance-ai-transparency.spec.ts`.
- [ ] T116 [P] [US7] Contract test: unknown GDPR posture reduces recommendation confidence (FR-053) in `audit/tests/contract/compliance-confidence-reduction.spec.ts`.

---

## Phase 10: User Story 8 — Funding & Subsidy Readiness (Priority: P2)

**Goal**: French hotels opt into a funding-readiness module that produces a structured project brief pre-filled from audit data, with an explicit eligibility disclaimer.

**Independent Test**: A French hotel completes the audit, opens the funding module, downloads a brief containing all documented sections and the disclaimer (FR-060, FR-062, SC-015).

### Implementation for User Story 8

- [ ] T117 [P] [US8] Create `audit/lib/funding/brief-generator.ts` — pre-fills `content_json` from audit data; lists remaining inputs.
- [ ] T118 [US8] Implement `getFundingBriefPreview` + `generateFundingBrief` server actions; non-FR hotels return `available: false` with redirect or message.
- [ ] T119 [US8] Implement funding-brief page at `audit/app/(client)/a/[token]/funding-brief/page.tsx`.
- [ ] T120 [US8] Extend `audit/workers/report.worker.ts` — render funding-brief PDF via a separate template.

### Tests for User Story 8

- [ ] T121 [P] [US8] Contract test: non-FR hotel sees graceful "not available" surface in `audit/tests/contract/funding-non-fr.spec.ts`.
- [ ] T122 [P] [US8] Contract test: generated brief contains all documented sections + disclaimer (SC-015) in `audit/tests/contract/funding-brief-content.spec.ts`.

---

## Phase 11: User Story 9 — Tiered Audit Levels & Packaging (Priority: P2)

**Goal**: Five tiers (free / mini / full / consultant_assisted / implementation) produce clearly differentiated artifacts; no tier exposes another's output; upgrade pathway is explicit at every boundary.

**Independent Test**: A free-tier visitor cannot access mini-tier output; the upgrade page lists exactly what is added at the next tier (FR-080, FR-081, FR-082).

### Implementation for User Story 9

- [ ] T123 [P] [US9] Create tier-enforcement guard in `audit/lib/auth/tier-gate.ts` — every project-bound server action checks `project.tier` against required tier.
- [ ] T124 [P] [US9] Implement upgrade page at `audit/app/(public)/upgrade/page.tsx` — tier comparison table.
- [ ] T125 [US9] Create `audit/lib/tier/differences.ts` — canonical description of what each tier adds.

### Tests for User Story 9

- [ ] T126 [P] [US9] Contract test: free-tier hotel cannot access paid-tier output (FR-082) in `audit/tests/contract/tier-gate.spec.ts`.

---

## Phase 12: User Story 10 — Knowledge Governance & Source Attribution (Priority: P2)

**Goal**: Every data point that drives a recommendation carries source + contributor + date + confidence; freshness warnings visible to team and softer caveats to clients; conflicts surfaced rather than silently chosen between; full traceability per rendered recommendation.

**Independent Test**: Open any rendered recommendation and drill into "why was this suggested" — see every signal with provenance (FR-113, SC-010, SC-011).

### Implementation for User Story 10

- [ ] T127 [P] [US10] Extend `audit/lib/governance/` — every vendor render path includes per-field source label, contributor, last-verified, confidence (FR-110).
- [ ] T128 [P] [US10] Create `audit/components/governance/` — `SourceLabelChip`, `FreshnessWarning`, `ConflictBanner` (reusable across vendor, recommendation, scan-finding renders).
- [ ] T129 [US10] Implement `audit/lib/governance/traceability.ts` — enumerates `{ answers, scan_findings, vendor_fields }` for any `recommendation_id` (FR-113); used by the report renderer and the consultant workspace.

### Tests for User Story 10

- [ ] T130 [P] [US10] Contract test: traceability returns the same enumeration as `recommendations.signals_consulted` for every recommendation in `audit/tests/contract/traceability.spec.ts`.
- [ ] T131 [P] [US10] Contract test: stale vendor entry surfaces freshness indicator (SC-012) in `audit/tests/contract/freshness-indicator.spec.ts`.

---

## Phase 13: User Story 11 — Self-Enriching Knowledge Base (Priority: P3)

**Goal**: Completed audits propose enrichments to the vendor database (new vendors, new integrations, new limitations) into a team review queue with `client_reported` source attribution; merging upgrades the attribution.

**Independent Test**: A simulated audit mentioning an unknown PMS appears in the admin queue as a candidate with the available data populated (FR-120, FR-121, SC-018).

### Implementation for User Story 11

- [ ] T132 [P] [US11] Create `audit/lib/enrichment/extractor.ts` — diff audit-mentioned vendors against the `vendors` table; build candidate payloads.
- [ ] T133 [P] [US11] Create `audit/lib/enrichment/candidate-builder.ts` — assemble `candidate_enrichments` rows with attribution and `pending` status.
- [ ] T134 [US11] Implement `audit/workers/enrichment.worker.ts` — runs after `submitAudit`.
- [ ] T135 [US11] Implement `acceptCandidateEnrichment` + `rejectCandidateEnrichment` server actions in `audit/lib/enrichment/review.ts` — on accept, merge changes into a new `vendor_versions` row and upgrade source label.
- [ ] T136 [US11] Implement review queue page at `audit/app/admin/enrichment-queue/page.tsx`.

### Tests for User Story 11

- [ ] T137 [P] [US11] Contract test: audit mentioning unknown vendor produces a pending candidate (FR-120, FR-121, SC-018) in `audit/tests/contract/enrichment-extraction.spec.ts`.

---

## Phase 14: User Story 12 — Aggregate Learning Loop (Priority: P3)

**Goal**: Across the audit corpus, patterns (frequent bottlenecks, stack combinations, goal-to-recommendation mappings, implementation outcomes) surface to the team for promotion to rules or dismissal; no single hotel's identity leaks outside consultant-authorized contexts.

**Independent Test**: With the corpus threshold met, a learned pattern appears in the admin review board; promoting it adds a rule; the aggregate view never exposes a hotel ID (SC-019, FR-133).

### Implementation for User Story 12

- [ ] T138 [P] [US12] Add the `mv_audit_segment_outcomes` materialized view definition + index to the Drizzle migration set (extends T019).
- [ ] T139 [P] [US12] Create `audit/lib/learning/pattern-detector.ts` — threshold-based pattern surfacing; threshold configurable via env (default N=50).
- [ ] T140 [P] [US12] Create `audit/lib/learning/confidence-adjuster.ts` — post-implementation feedback → rule-level confidence in `audit/lib/recommend/rules/` config.
- [ ] T141 [US12] Implement `audit/workers/learning.worker.ts` — nightly: `REFRESH MATERIALIZED VIEW CONCURRENTLY`, detect patterns, enqueue `ai.summarize_pattern`, adjust confidence.
- [ ] T142 [US12] Implement `ai.summarize_pattern` handler — extends `ai.worker.ts` with the P4 prompt from [contracts/ai-prompts.md](./contracts/ai-prompts.md).
- [ ] T143 [US12] Implement `promoteLearnedPatternToRule` + `dismissLearnedPattern` server actions.
- [ ] T144 [US12] Implement learned-patterns review page at `audit/app/admin/learned-patterns/page.tsx` — segment-anonymized view.

### Tests for User Story 12

- [ ] T145 [P] [US12] Contract test: aggregate view never exposes hotel identity (FR-133) in `audit/tests/contract/learning-anonymization.spec.ts`.

---

## Phase 15: User Story 13 — Implementation Support Tooling (Priority: P3)

**Goal**: Implementation-tier hotels build a structured knowledge base (organized by FR-140 topics) on the hotel record (not project), track implementation step progress, record post-implementation performance signals; the KB is reusable by other features (AI agent, FAQ generation, messaging templates).

**Independent Test**: An implementation-tier hotel builds a KB; later features that need structured content (e.g., AI agent) consume the same KB without re-collection (FR-143).

### Implementation for User Story 13

- [ ] T146 [P] [US13] Implement `upsertKnowledgeBaseEntry` server action in `audit/lib/implementation/kb.ts` — entries link to `hotels.id`, not `projects.id`.
- [ ] T147 [P] [US13] Implement `markImplementationStepDone` + `recordPerformanceMetric` server actions in `audit/lib/implementation/tracker.ts`.
- [ ] T148 [US13] Implement implementation tracker page at `audit/app/admin/implementation/[projectId]/page.tsx` — KB editor + step board + vendor side-by-side + performance trend chart.
- [ ] T149 [P] [US13] Create `audit/components/implementation/` — `KbTopicEditor`, `StepBoard`, `VendorSideBySide` (reuse T099 if shape matches), `PerformanceTrendChart`.

### Tests for User Story 13

- [ ] T150 [P] [US13] Contract test: knowledge base persists across projects of the same hotel (FR-143) in `audit/tests/contract/kb-hotel-lifetime.spec.ts`.

---

## Phase 16: User Story 14 — Long-Term Integration Layer (schema-only) (Priority: P3)

**Goal**: Persist `integration_workflows` rows and surface them in admin views and report references. The runtime execution engine is intentionally NOT built in this feature per [research.md](./research.md) R14.

**Independent Test**: An admin can create an `IntegrationWorkflow` row for a hotel; reports can reference it; no runtime is invoked.

### Implementation for User Story 14

- [ ] T151 [US14] Implement `createIntegrationWorkflow` + `updateIntegrationWorkflow` + `archiveIntegrationWorkflow` server actions in `audit/lib/integrations/admin-actions.ts`.
- [ ] T152 [US14] Implement integrations admin page at `audit/app/admin/integrations/page.tsx` — CRUD only, banner clarifying runtime is not yet active.
- [ ] T153 [US14] Surface planned `IntegrationWorkflow` references in the report snapshot's "Next steps" when relevant.

---

## Phase 17: User & Role Management (cross-cutting completion)

- [ ] T154 [P] Implement `createUser` + `grantRole` + `revokeRole` server actions in `audit/lib/auth/user-admin-actions.ts` (super_admin only).
- [ ] T155 [P] Implement user list + role management page at `audit/app/admin/users/page.tsx` — composable-role chips.
- [ ] T156 [P] Contract test: revoking one role preserves the user's other roles (Clarification Q4) in `audit/tests/contract/composable-roles.spec.ts`.

---

## Phase 18: Polish & Cross-Cutting Concerns

- [ ] T157 [P] Wire all new Plausible events through a single module `audit/lib/analytics/events.ts` — `scan_started`, `scan_completed`, `scan_email_opt_in`, `scan_completed_viewed`, `audit_started`, `audit_section_progressed`, `audit_voice_used`, `audit_submitted`, `report_generated`, `report_published`, `report_exported`, `scenario_compared`, `recommendation_inspected`, `vendor_shortlist_clicked`, `funding_brief_generated`.
- [ ] T158 [P] Performance pass — verify LCP ≤ 2.5s on free-scan landing (`audit/tests/performance/lcp-landing.spec.ts`) and on first questionnaire paint (`audit/tests/performance/lcp-questionnaire.spec.ts`).
- [ ] T159 [P] Performance pass — verify client-form JS budget ≤ 200 KB gzipped via `next build --analyze`; record baseline in `audit/tests/performance/bundle-size.json`.
- [ ] T160 [P] Update `src/politique-confidentialite.html` and `src/mentions-legales.html` — list new providers (Bedrock Frankfurt, Deepgram EU, Scaleway Paris) and the audit-log carve-out under hotelier deletion.
- [ ] T161 [P] Verify Bedrock prompt-cache hit rate > 80 % in synthetic load test (`audit/tests/performance/ai-cache.spec.ts`).
- [ ] T162 [P] Remove `mysql2` from `audit/package.json` after production MySQL→Postgres cutover (closes T001's tail).
- [ ] T163 Run [quickstart.md](./quickstart.md) end-to-end across all P1 stories.
- [ ] T164 Run full E2E + contract suite (`pnpm test && pnpm test:contract && pnpm test:e2e && pnpm typecheck && pnpm lint`); fix regressions.
- [ ] T165 Regression sweep: SC-014 (question wording preservation), SC-017 (consultant report content separation), SC-020 (snapshot immutability) across a sampled set of past audits.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies; can start immediately.
- **Foundational (Phase 2)** depends on Setup; blocks all user-story phases.
- **User stories P1 (Phases 3 → 8)** depend on Foundational; can run in parallel team-wise.
- **User stories P2 (Phases 9 → 12)** depend on Foundational; many also build on P1 outputs (e.g., compliance + governance plug into the recommendation engine from US 3).
- **User stories P3 (Phases 13 → 16)** depend on Foundational AND on at least US 3 + US 5 + US 6 being functional, because the enrichment / learning / implementation tooling consume their data.
- **Role management (Phase 17)** depends on Foundational and any P1 admin story (US 5 or US 6) being underway.
- **Polish (Phase 18)** is final; depends on all desired stories being complete.

### Within-Phase Dependencies

| Within | Rule |
|---|---|
| Setup | T005 / T006 (Postgres cutover) must precede any DB migration generation; T001 / T009 (package.json) must serialize since both edit the same file. |
| Foundational | T010–T018 (parallel schema files) all complete before T019 (single migration generation). T020 depends on T010. T024–T030 depend on T010 indirectly via `users` table. |
| US 1 | T033–T036 parallel before T037 (orchestrator); T037 before T038 (worker); T039 / T040 / T041 / T042 / T043 / T044 / T045 / T046 mostly parallel after T038. Tests run last (T047–T049). |
| US 2 | T050–T052 parallel; T053 / T054 / T055 / T056 depend on them; T057 / T058 / T061 parallel UI work; T059 / T060 / T062 parallel infra. |
| US 3 | T068–T072 parallel rules; T073 depends on prompt content + rules summary; T074 depends on T073 + T024 + T025; T075 / T076 / T077 sequential along the snapshot path. |
| US 4 | T087 / T088 parallel; T089 depends on snapshot-builder (T075); T090 / T091 / T092 parallel. |
| US 5 / US 6 | Admin actions before pages before components; seed scripts last. |
| Polish | Most items independently parallel; T162 depends on production cutover being complete. |

### Parallel Opportunities

- **Within Setup**: T002 / T003 / T004 / T007 / T008 — different files, no shared dependency.
- **Within Foundational**: T010 / T011 / T012 / T013 / T014 / T015 / T016 / T017 / T018 — all separate schema files, parallel.
- **Within each P1 story**: rule files, mappers, components, and contract tests are routinely parallel.
- **Across user stories** after Foundational: with a multi-person team, US 1, US 5, and US 6 can proceed in parallel (different surfaces of the platform).

### Parallel Example: User Story 1

```bash
# After T038 (scan worker) lands, launch in parallel:
Task: "Implement audit/app/api/scan/start/route.ts (T039)"
Task: "Implement audit/app/api/scan/[scanId]/status/route.ts (T040)"
Task: "Create audit/components/scan-result/ component set (T045)"
Task: "Wire Plausible events for scan flow (T046)"
Task: "Contract test scan-start happy path (T047)"
Task: "Contract test scan-start rejections (T048)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 (US 1).
2. **STOP and VALIDATE**: free-scan landing is live, anonymous visitors get value, optional email captures a lead.
3. Deploy to `audit.rinzlerstudio.com` and gather real URL submissions.

### Incremental Delivery

| Increment | Adds | New value |
|---|---|---|
| MVP | US 1 | Public free-scan funnel and lead capture. |
| Self-service tier | + US 2 + US 3 | Full hotelier audit + decision-support report. |
| Consultant tier | + US 4 | Consultant-assisted engagements supported. |
| Admin operability | + US 5 + US 6 | Team can manage vendors and questionnaire without engineering deploys. |
| Trust + commercial layer | + US 7 + US 8 + US 9 + US 10 | Compliance, funding, tier packaging, source attribution surfaces. |
| Compounding intelligence | + US 11 + US 12 | Self-enriching DB and learning loop. |
| Implementation service | + US 13 + US 14 schema | Highest-touch tier supported. |
| Polish | Phase 18 | Performance budgets, privacy docs, cache hit-rate guarantees. |

### Parallel Team Strategy

With 2–3 developers:

1. Together: complete Phase 1 + Phase 2 (1–2 weeks).
2. Once foundational lands:
   - Dev A: US 1 → US 4 (the client + consultant funnel).
   - Dev B: US 5 → US 6 (admin operability — vendor + questionnaire management).
   - Dev C: US 7 → US 10 (compliance, funding, governance — depends on US 3 outputs).
3. Reconvene after self-service tier ships; tackle P3 stories sequentially or in parallel based on commercial priorities.

---

## Notes

- `[P]` tasks operate on different files with no incomplete dependency; they can be parallelized by separate workers or developers.
- `[US#]` tags map every implementation task to a user story for traceability.
- Each user-story phase ends at a checkpoint where that story is independently testable; no story is permitted to break a prior story's tests.
- All file paths are repo-root-relative; the feature is implemented in-place inside `audit/` (no new top-level directory).
- Constitution v1.2.0 governs: France/EU residency is non-negotiable; voice audio MUST NOT be persisted; published reports are immutable; tokenized client routes + admin remain `noindex`; free-scan landing is the only newly indexable surface.
- The constitution amendment (v1.1.2 → v1.2.0) landed on 2026-05-17 and is reflected in `.specify/memory/constitution.md`. The form-runtime clause now permits a DB-sourced declarative schema for managed-questionnaire features.

---

## Summary

- **Total tasks**: 165
- **By phase**: Setup 9, Foundational 23, US 1 (17), US 2 (18), US 3 (19), US 4 (8), US 5 (8), US 6 (9), US 7 (5), US 8 (6), US 9 (4), US 10 (5), US 11 (6), US 12 (8), US 13 (5), US 14 (3), Users/Roles 3, Polish 9.
- **MVP scope**: Phases 1 + 2 + 3 (US 1) = 49 tasks for the free-scan public funnel.
- **Self-service shipping increment**: Phases 1 + 2 + 3 + 4 + 5 = 86 tasks (US 1 + US 2 + US 3 — visitor → full report).
- **Parallel opportunities**: 9 of 9 schema-definition tasks (T010–T018); ~40 % of implementation tasks across stories are `[P]`-parallelizable on a multi-developer team.
- **Format check**: every task above carries a checkbox, sequential ID (T001…T165), `[P]` where applicable, `[US#]` label inside user-story phases, and an exact file path. ✅
