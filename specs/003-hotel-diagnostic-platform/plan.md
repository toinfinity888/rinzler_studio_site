# Implementation Plan: Hotel Diagnostic Platform

**Branch**: `003-hotel-diagnostic-platform` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-hotel-diagnostic-platform/spec.md`

## Summary

The Hotel Diagnostic Platform extends the existing `audit/` Next.js application (introduced by feature `001-hotel-audit-platform`) into a full decision-support platform for independent hotels. The audit app's foundational primitives — project lifecycle, tokenized client access, autosave, internal notes, audit log, i18n — are preserved and reused. Five new subsystems are added alongside:

1. **External Scanner** — a worker-based subsystem that, given a URL, produces structured findings (performance, schema, AI-search readiness, booking-path behavior, channel detection, vendor fingerprinting) without any user input.
2. **Dynamic Questionnaire Engine** — replaces the static TS form schema with a DB-backed, conditional, versioned, multilingual question system that is managed through an admin interface.
3. **Vendor Database** — a curated, versioned, source-attributed catalogue of hotel-technology solutions with rich decision-relevant fields and admin CRUD.
4. **Recommendation Engine** — multi-dimensional scoring, scenario generation, tool shortlisting, impact estimation, and 30 / 60 / 90-day roadmap generation, with AI-supported reasoning (EU-resident inference) and full traceability.
5. **Knowledge Governance & Learning** — provenance tracking, freshness, conflict surfacing, self-enriching candidate-review queue, and aggregate pattern detection across completed audits.

Two new product capabilities span all subsystems: **voice input** with no audio persistence (streaming transcription, transcript-only storage) and **consultant-assisted mode** that overlays a workspace view on every project. Five audit tiers (free scan → mini → full → consultant-assisted → implementation) are the commercial packaging layer.

The plan extends the audit app's existing Next.js + TypeScript + Drizzle + NextAuth stack with: a background-job runtime for scans and async reasoning; an EU-resident inference provider for AI features; a streaming transcription provider with no audio retention; and a migration from MySQL to Postgres to support the more complex relational and full-text needs of the vendor database, the dynamic questionnaire, and the learning loop. The codebase stays inside `audit/` and continues to deploy as a single Next.js application plus its background workers.

The plan also identifies one **MINOR constitution amendment** required: the audit sub-stack's wording that the form runtime is "fed by a single declarative schema at `audit/lib/form-schema/sections.ts`" must be broadened to allow a DB-sourced declarative schema for managed-questionnaire features, while preserving the principle that there is a single source of truth.

## Technical Context

**Language/Version**: TypeScript 5.6+ on Node.js 20 LTS (matches existing `audit/` runtime).

**Primary Dependencies** (additions on top of the existing `audit/package.json`):

- **Next.js 15** (App Router, server actions) — unchanged.
- **React 19** — unchanged.
- **TailwindCSS 4** — unchanged (constitution permits 3.4+).
- **Drizzle ORM** — unchanged.
- **`next-auth` v5 (beta)** with **Credentials provider** + **`@node-rs/argon2`** — unchanged for auth primitive; extended for composable roles per FR-162.
- **`react-hook-form` + Zod** — unchanged for client-side validation; the schema is now derived at runtime from the DB-backed questionnaire (Zod schema is built dynamically per session) rather than imported from a TS file.
- **`@aws-sdk/client-bedrock-runtime`** (NEW) — Anthropic Claude via AWS Bedrock in the Frankfurt region (`eu-central-1`) for EU-resident inference. Used for: voice transcript structuring, recommendation reasoning, scenario synthesis, candidate-enrichment extraction, learned-pattern surfacing.
- **`playwright`** (NEW, server-side use) — headless browser for the external scanner; produces a real DOM render, fetches all linked resources, runs Lighthouse audits, and supports the vendor-fingerprinting heuristics.
- **`lighthouse`** (NEW) — Core Web Vitals + performance scoring (driven through Playwright's CDP session).
- **`cheerio`** (NEW) — server-side HTML parsing for FAQ heuristics, schema.org JSON-LD extraction, multilingual structure detection.
- **`@deepgram/sdk`** (NEW) — streaming speech-to-text. Deepgram is EU-hostable, supports streaming with no audio retention when configured `keep_audio=false`, and has French as a first-class language. Alternative captured in research.md.
- **`bullmq` + `ioredis`** (NEW) — background-job runtime for scans, AI reasoning, and the candidate-enrichment / learning pipelines. Redis is FR-hostable (Clever Cloud, Scaleway).
- **`pg`** (NEW) — Postgres driver. Replaces `mysql2`.
- **`pdfkit`** (NEW) — PDF generation for the exportable report artifact (FR-093). Pure Node, no headless-browser PDF dependency.

**Storage**:

- **Postgres 16** (replacing MySQL) — France-resident managed instance (Clever Cloud or Scaleway). Postgres is chosen over the constitution's prior default of SQLite because: the vendor database needs `jsonb` for flexible per-vendor field schemas; the dynamic questionnaire needs `jsonb` for conditional logic and translations; the learning loop benefits from materialized views; and Postgres's `pgvector` extension keeps the door open for embeddings-based vendor matching without another migration. Drizzle ORM remains, satisfying the constitution's swap permission.
- **Redis (managed, FR-resident)** — BullMQ queue backend, scanner rate limiting, scan-result short-cache, transient transcription session tokens. No durable PII in Redis.
- **Object storage (FR-resident, e.g., Scaleway Object Storage Paris)** — generated PDF reports, exported funding briefs, optional knowledge-base attachments. Lifecycle rules mirror the retention policy (FR-166).

**Testing**:

- **Vitest** for unit (scoring, scanner-finding mappers, recommendation rules, voice-transcript extractors, Zod-schema builders).
- **Vitest + `testcontainers` / `pg-testcontainer`** for integration (Drizzle + Postgres + BullMQ workers against ephemeral containers).
- **Playwright** for E2E (free-scan happy path, full client audit, consultant-assisted session, admin questionnaire / vendor management).
- **Contract tests** under `audit/tests/contract/` for every server action and worker job specified in `contracts/`.

**Target Platform**:

- **Web application**, served from a Node.js 20 process behind a reverse proxy. **Hosting**: Clever Cloud (France) is the default for V1 of this feature; o2switch cPanel remains documented as a fallback for the marketing site but is not viable for this feature given the worker + Redis + Postgres footprint.
- **Mobile-responsive throughout** — hotelier flows MUST be usable on phones (per FR-161).
- **AI inference target**: AWS Bedrock `eu-central-1` (Frankfurt) for Anthropic Claude models. Frankfurt is EU territory, complies with GDPR transfer rules, and Anthropic has a published DPA covering Bedrock deployments.

**Project Type**: Web application with background workers. Single Next.js app (`audit/`) handles HTTP; a sibling `audit/workers/` directory hosts BullMQ workers that share the same Drizzle schema and Postgres connection.

**Performance Goals**:

- **Free scan** completes and returns a structured diagnostic in under **2 minutes** for at least 90 % of valid hotel URLs (SC-001). Target P50 ≤ 45 s.
- **Full audit completion** time for a self-service hotelier ≤ **30 minutes of active time** (SC-005).
- **Questionnaire question render** latency ≤ 150 ms after answer commit (perceived as immediate).
- **Recommendation engine** end-to-end report generation ≤ 60 s P95 once the questionnaire is complete; this includes AI reasoning calls (with prompt caching).
- **LCP** ≤ 2.5 s on throttled 4G for the free-scan landing and the client questionnaire's first paint (constitution Audit Sub-Stack budget).
- **Client-side JS budget** ≤ 200 KB gzipped for the questionnaire flow (constitution). Voice input lib is loaded on demand only when a voice-enabled question is opened.

**Constraints**:

- **All PII MUST remain in EU**. AI inference happens in Bedrock Frankfurt; transcription happens in Deepgram EU; database and object storage are France-hosted. No US-hosted control plane is permitted.
- **No raw audio is persisted** (FR-013): the transcription provider is configured for streaming with `keep_audio=false`; the audio buffer is discarded once transcription completes.
- **Vendor data and recommendations MUST be traceable** to source attribution (FR-110, FR-113). Engine output must enumerate the signals/answers/vendor-fields that informed each recommendation.
- **Published reports are immutable** (FR-094, SC-020): once published, a report renders the same content forever, regardless of later DB changes. Implemented as a versioned snapshot per publication event.
- **Anonymous free-scan data auto-purges at 90 days** (FR-166): a daily worker sweeps expired free-scan projects.
- **Tokenized client routes and the entire admin surface MUST emit `noindex`** (constitution).
- **Free-scan landing is a public, indexable page**, treated as a marketing surface and subject to Principle V (SEO + Plausible events) like the marketing site.

**Scale/Scope (V1 of this feature)**:

- ≤ **5 concurrent team users** (consultants + admins) under composable roles.
- ≤ **500 active hotel projects** in the first 12 months across all tiers.
- ≤ **1,000 free scans per month** at steady state (the public funnel).
- **Vendor database**: target 50 entries at launch, 300 within 12 months.
- **Questionnaire**: ~200 managed questions across blocks, with conditional logic and 2 language translations (FR, EN) at launch.
- **Audit corpus**: at scale 12 + months, ≥ 1,000 completed full-tier audits will feed the learning loop (FR-130, SC-019).
- **AI inference cost ceiling**: per-audit Claude spend kept under €3 by aggressive prompt caching of (a) vendor database, (b) question definitions, (c) scoring rubric.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution is **v1.1.2** (last amended 2026-05-13). Five core principles apply repo-wide; the "Audit Platform Sub-Stack (`audit/`)" section governs this feature's technical surface.

| Principle | Verdict | Notes |
|-----------|---------|-------|
| **I. RGPD & Privacy First (NON-NEGOTIABLE)** | PASS (with documented controls) | All hosting in France/EU. AI inference via Bedrock Frankfurt with an Anthropic DPA. Transcription via Deepgram EU with `keep_audio=false` (FR-013). Anonymous free-scan auto-purge at 90 days (FR-166). Voice raw audio never persisted. Tokenized client routes `noindex`. Free-scan optional email capture uses explicit consent language (FR-009). PII minimization: hotelier data never sent to AI inference without redaction of personal identifiers (consultant name, guest names from voice answers). Audit log retained for compliance demonstration with documented carve-out. |
| **II. Conversion-Focused Content** | PASS (re-interpreted) | The free-scan landing IS a marketing surface and MUST carry the free-audit CTA per the marketing-segment rule. The questionnaire, admin, and consultant workspaces are tools, so the "single primary action per screen" rule applies: free-scan result → "Start full audit"; questionnaire → "Continue / Submit"; admin project list → "New project"; etc. |
| **III. French-Canonical, i18n-Ready** | PASS | French remains canonical. Questionnaire translations live in DB rows (per-question, per-language). Vendor descriptions live in DB rows (per-vendor, per-language). Report templates are i18n-keyed. FR-104 mandates fallback to canonical French with a visible indicator when a translation is missing. |
| **IV. Design Tokens & Component Reuse** | PASS | All new UI components consume `audit/styles/tokens.css` (which mirrors `src/styles/tokens.css`). New admin views — questionnaire editor, vendor editor, candidate-enrichment review queue, consultant workspace — share a common admin shell. Recommendation cards, scenario-comparison views, scoring widgets, and roadmap cards are first-class reusable components. |
| **V. SEO & Analytics Discipline** | PASS (scoped) | Free-scan landing carries unique `<title>`, description, OG tags, structured data (`WebApplication` + `Service`). Tokenized client routes and admin remain `noindex`. New Plausible events: `scan_started`, `scan_completed`, `scan_email_opt_in`, `audit_started`, `audit_section_completed`, `audit_voice_used`, `audit_submitted`, `report_published`, `report_exported`, `scenario_compared`, `vendor_shortlist_clicked`, `funding_brief_generated`. Event names snake_case, no free-text user input captured. |

**Audit Sub-Stack constraints**:

| Constraint | Status |
|---|---|
| Next.js 15+ on Node 20 LTS, App Router, standalone output | KEEP |
| TypeScript 5.6+ strict, React 19 | KEEP |
| TailwindCSS 3.4+ with tokens.css mirror | KEEP (currently on Tailwind 4, which is ≥ 3.4) |
| Persistence: Drizzle ORM (SQLite default, Postgres permitted) | CHANGE: Drizzle + Postgres (replacing MySQL, which is already in `audit/` and is itself a constitution divergence from "SQLite default"). Postgres is constitution-sanctioned without amendment. |
| Auth.js v5 Credentials, Argon2id | KEEP, extend with composable roles |
| Form runtime: `react-hook-form` + Zod, fed by a single declarative schema at `audit/lib/form-schema/sections.ts` | **AMEND** (MINOR) — see "Constitution Amendment Required" below. |
| Hosting: France-resident only, default o2switch, fallback Clever Cloud | CHANGE default to Clever Cloud (o2switch cannot host the Redis + worker + Postgres footprint cleanly). All hosting remains France/EU. |
| Plausible-only client scripts | KEEP |
| Tokenized client routes `noindex`, admin `noindex` | KEEP. Free-scan landing is an exception (public marketing surface). |
| Access tokens hashed; internal notes excluded from client view | KEEP, expand to consultant overrides (FR-072). |
| LCP ≤ 2.5 s, JS ≤ 200 KB gzipped on client form | KEEP (questionnaire flow). Free-scan landing and admin surfaces inherit standard marketing-site budgets. |

### Constitution Amendment Required (MINOR)

The current Audit Sub-Stack wording binds the form runtime to "a single declarative schema at `audit/lib/form-schema/sections.ts`." The dynamic-questionnaire feature (User Story 2, FR-100 through FR-104) requires that the schema be sourced from the database so it can be managed through an admin interface without code deploys.

**Proposed amendment** (v1.1.2 → v1.2.0, MINOR bump because it expands guidance in an existing constraint):

> Form runtime: `react-hook-form` + Zod, fed by a declarative schema that is the single source of truth. The schema MAY be sourced either from a TypeScript file (for fixed forms) OR from the database (for managed-questionnaire features that require non-engineer editing, conditional logic, versioning, and per-language translations). When the schema is DB-sourced, a runtime Zod schema MUST be derived from the same row set that the renderer consumes, preserving the single-source-of-truth invariant.

The amendment is scoped to wording; no principle changes, no constraint is removed.

**Action**: This plan filed the amendment as a parallel change. The amendment landed on 2026-05-17 (constitution v1.1.2 → v1.2.0); the broadened form-runtime clause is now in force and no longer blocks `/speckit.tasks`.

## Project Structure

### Documentation (this feature)

```text
specs/003-hotel-diagnostic-platform/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output — full schema design
├── quickstart.md                    # Phase 1 output — developer onboarding
├── contracts/                       # Phase 1 output — interface specs
│   ├── client-server-actions.md     # Server actions exposed to tokenized client routes
│   ├── admin-server-actions.md      # Server actions exposed to authenticated team users
│   ├── public-server-actions.md     # Anonymous free-scan endpoints
│   ├── worker-jobs.md               # BullMQ job specs (scan, ai-reason, transcribe, etc.)
│   ├── ai-prompts.md                # Claude prompt contracts (system messages, schemas)
│   └── report-export.schema.json    # Versioned JSON schema for the exportable report
├── checklists/
│   └── requirements.md              # From /speckit.specify
└── tasks.md                         # Phase 2 output (created by /speckit.tasks)
```

### Source Code (extension of existing `audit/`)

```text
audit/
├── app/
│   ├── (public)/                    # NEW — public, indexable surfaces
│   │   ├── page.tsx                 # Free-scan landing (FR-001, US 1)
│   │   ├── scan/[scanId]/page.tsx   # Free-scan result view (anonymous)
│   │   └── upgrade/page.tsx         # Tier-upgrade pathway from free → mini
│   ├── (client)/                    # EXISTING + EXTENDED — tokenized client routes
│   │   ├── a/[token]/
│   │   │   ├── page.tsx             # Project landing (existing, extended)
│   │   │   ├── audit/[blockId]/     # NEW — dynamic-block renderer
│   │   │   ├── voice/               # NEW — voice-answer review surface
│   │   │   ├── report/page.tsx      # NEW — published-report view (post-submit)
│   │   │   └── funding-brief/       # NEW — funding-readiness module (FR market)
│   ├── admin/                       # EXISTING + EXTENDED
│   │   ├── projects/                # Existing
│   │   ├── consultant/[projectId]/  # NEW — consultant workspace (US 4)
│   │   ├── vendors/                 # NEW — vendor DB admin (US 5)
│   │   ├── questionnaire/           # NEW — questionnaire admin (US 6)
│   │   ├── enrichment-queue/        # NEW — candidate-enrichment review (US 11)
│   │   ├── learned-patterns/        # NEW — pattern review (US 12)
│   │   ├── implementation/[projectId]/  # NEW — implementation-tier tracker (US 13)
│   │   └── users/                   # NEW — team user + role management (FR-162)
│   └── api/
│       ├── auth/                    # Existing (NextAuth)
│       ├── cron/                    # Existing (purge sweep) — extended
│       ├── scan/start/route.ts      # NEW — anonymous scan trigger
│       └── transcribe/session/route.ts  # NEW — short-lived transcription token issuer
│
├── components/                      # EXISTING + EXTENDED
│   ├── scan-result/                 # NEW — observation cards, opportunity map
│   ├── questionnaire/               # NEW — dynamic field renderer (driven by DB rows)
│   ├── voice/                       # NEW — voice capture (no audio persistence)
│   ├── report/                      # NEW — exec summary, scores, scenarios, roadmap
│   ├── vendor/                      # NEW — vendor cards, comparison, source labels
│   ├── consultant/                  # NEW — workspace overlays, override controls
│   └── ui/                          # Existing shared primitives
│
├── lib/
│   ├── form-schema/                 # EXISTING — to become a fallback path for static forms; not used by the dynamic questionnaire
│   ├── questionnaire/               # NEW — DB-sourced schema builder, branching evaluator, Zod-at-runtime
│   ├── scanner/                     # NEW — playwright/lighthouse drivers, fingerprinting heuristics, finding mappers
│   ├── ai/                          # NEW — Bedrock client, prompt templates, prompt caching, structured-output schemas
│   ├── transcribe/                  # NEW — Deepgram session issuance, streaming bridge (no audio persistence)
│   ├── recommend/                   # NEW — multi-dimensional scoring, scenario synthesis, impact estimation, roadmap generation
│   ├── governance/                  # NEW — source-attribution helpers, freshness checks, conflict surfacing
│   ├── enrichment/                  # NEW — candidate extraction from audits, review-queue helpers
│   ├── learning/                    # NEW — aggregate-pattern detection (materialized views + summarizer)
│   ├── compliance/                  # NEW — risk evaluators, checklist generators
│   ├── funding/                     # NEW — French funding-brief generator
│   ├── report/                      # NEW — render published-report snapshot; PDF generation
│   ├── auth/                        # EXISTING — extended for composable roles
│   ├── audit-log/                   # EXISTING — extended for new action types
│   └── db/                          # EXISTING — Drizzle client (Postgres)
│
├── workers/                         # NEW — sibling BullMQ workers
│   ├── scan.worker.ts               # Runs Lighthouse + Playwright per scan job
│   ├── ai.worker.ts                 # Calls Bedrock for reasoning / extraction
│   ├── enrichment.worker.ts         # Post-audit candidate extraction
│   ├── learning.worker.ts           # Nightly aggregate-pattern detection
│   ├── purge.worker.ts              # Daily 90-day free-scan sweep + hotelier-deletion cascades
│   └── report.worker.ts             # PDF render + object-storage upload
│
├── db/
│   ├── schema.ts                    # EXISTING — extended with new entities (see data-model.md)
│   └── migrations/                  # NEW — Drizzle migrations including the MySQL→Postgres cutover
│
├── tests/
│   ├── unit/                        # EXISTING + EXTENDED
│   ├── integration/                 # EXISTING + EXTENDED — with testcontainers Postgres
│   ├── contract/                    # NEW — per server-action + per worker-job contract
│   └── e2e/                         # EXISTING + EXTENDED — free-scan, full audit, consultant flow
│
├── data/                            # Existing seeds
└── scripts/
    ├── migrate.ts                   # Existing
    ├── migrate-mysql-to-postgres.ts # NEW — one-shot data migration
    ├── seed-vendor-db.ts            # NEW — bootstrap the vendor catalogue from db_hotels/ and curated YAML
    └── seed-questionnaire.ts        # NEW — import the 22-block questionnaire from spec into DB
```

**Structure Decision**: This feature is implemented as an in-place extension of the existing `audit/` Next.js application. No new top-level directory is introduced. The marketing site (`src/`) is untouched. The constitution's Audit Sub-Stack continues to govern everything inside `audit/`. Workers live under `audit/workers/` and share the same `audit/db/schema.ts`, ensuring a single source of truth for persistence.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Postgres replacing MySQL (which itself replaced the constitution's default SQLite) | The vendor database, dynamic questionnaire, and learning loop need `jsonb`, materialized views, and `pgvector` future-proofing. MySQL's JSON support is functional but second-class for these patterns; SQLite cannot host the worker concurrency profile. | Keep MySQL: the `jsonb` indexing, full-text, and `pgvector` story is materially worse, and we would migrate within 12 months anyway. Keep SQLite: incompatible with worker fan-out and Redis-backed BullMQ in a multi-process deployment. |
| Background-worker subsystem (BullMQ + Redis) | Lighthouse scans take 15–45 s each; AI reasoning is non-interactive; nightly enrichment / learning jobs need scheduled execution. Running these inline in Next.js API routes blocks request budgets and breaks the LCP target. | Run scans inline: rejected — violates LCP budget and creates user-perceived hangs. Use Vercel cron + serverless functions: rejected — non-EU control plane, violates Principle I. Use Inngest/Trigger.dev: rejected — non-EU control plane. Self-hosted BullMQ + Redis on Clever Cloud keeps everything in France. |
| AWS Bedrock (Frankfurt) for AI inference | The recommendation engine, voice-transcript structuring, candidate-enrichment extraction, and learned-pattern summarization all need a frontier LLM. Anthropic Claude is the strongest fit (long-context, prompt caching, structured outputs). Bedrock Frankfurt provides EU residency with an Anthropic-published DPA. | Call Anthropic API directly (US): rejected — violates Principle I and the audit sub-stack's France/EU residency clause. Use a smaller EU-only model: rejected — quality of reasoning over the 73-FR diagnostic surface is materially worse, and the platform's trust posture depends on recommendation quality. |
| Constitution amendment to broaden form-schema source | The Audit Sub-Stack currently binds the schema to a single TS file. Dynamic questionnaire management is a P1 user story (US 6) and cannot be delivered under the current wording. | Hard-code questions in TS: rejected — violates FR-100..FR-104. Build a separate "managed forms" service outside `audit/`: rejected — adds an unjustified second deployable. |

## Post-Design Constitution Re-Check

After producing [research.md](./research.md), [data-model.md](./data-model.md), all six [contracts/](./contracts/) artifacts, and [quickstart.md](./quickstart.md), each principle is re-evaluated against the actual designed surface:

| Principle | Verdict | Re-check notes |
|-----------|---------|---------------|
| **I. RGPD & Privacy First** | PASS (with new explicit controls) | Data-model and contracts confirm: `voice_captures` table holds no audio; `report.worker.ts` uploads to FR object storage; `purge.daily_sweep` enforces 90-day free-scan retention; `audit_log` carve-out for hotelier-deletion is named in admin-server-actions.md; `audit/lib/ai/redact.ts` is on every prompt path per ai-prompts.md; all providers (Bedrock Frankfurt, Deepgram EU, Sentry EU, Plausible) are EU-resident; AI prompts contain no PII. New explicit requirement surfaced during design: the `audit_log` deletion-scrubbing carve-out needs documentation in `politique-confidentialite.html` before launch (action for the implementation phase). |
| **II. Conversion-Focused Content** | PASS | Free-scan landing has the "Start full audit" primary action; result page has the "Continue to full audit" primary action with optional email opt-in adjacent; consultant workspace has scenario-comparison as the primary surface; admin lists have "New project / New vendor / New question" primaries. No screen designed without a clear primary action. |
| **III. French-Canonical, i18n-Ready** | PASS | `question_translations`, `vendor_translations` per-row per-language. UI strings stay in `audit/lib/form-schema/fr.ts` and parallel `en.ts`. Fallback indicator surfaced on the renderer per FR-104. Structured vendor fields (price tier, integrations, GDPR posture) are language-agnostic — translation gaps never block recommendations. |
| **IV. Design Tokens & Component Reuse** | PASS | New UI lives in named component groups (`components/scan-result/`, `components/questionnaire/`, `components/report/`, `components/vendor/`, `components/consultant/`) sharing the existing token system. No new color or spacing primitive is introduced; new states (do-not-do-now warning, confidence-low caveat) reuse existing severity tokens. |
| **V. SEO & Analytics Discipline** | PASS | Public surfaces (free-scan landing, free-scan result) emit per-page metadata + OG; tokenized routes and `/admin/*` emit `noindex`. The full Plausible event list (15 events) is captured in plan.md's Principle V row; event names are snake_case; no free-text capture. The free-scan result page is shareable but enumerates no project IDs and reveals no PII. |

**Audit Sub-Stack re-check after design**:

| Item | Verdict |
|---|---|
| Drizzle ORM preserved (Postgres swap) | PASS — see data-model.md. Drizzle is the single source of schema truth. |
| Auth.js v5 Credentials + Argon2id preserved | PASS — extended with `user_roles` table; no provider swap. |
| Form runtime: react-hook-form + Zod, single source of truth | PASS contingent on the proposed v1.1.2 → v1.2.0 constitution amendment landing. The runtime Zod schema is *built* from the DB rows at session start, preserving single-source-of-truth. |
| France-resident hosting | PASS — every provider in research.md is FR/EU. |
| Plausible-only client scripts | PASS — Deepgram WebSocket is a direct browser-to-EU-endpoint connection, no third-party script tag on the page. |
| LCP ≤ 2.5 s / JS ≤ 200 KB gzip on client form | PASS by design — questionnaire is server-rendered, the runtime Zod schema is sent only for the current block, voice library is dynamically imported on demand. |
| Tokens hashed; internal notes excluded from client view | PASS — admin-server-actions.md `publishConsultantReport` strips internal notes and override reasons before snapshot. |

**Complexity items reconfirmed**: All four items in Complexity Tracking remain necessary post-design; no simpler alternative emerged during Phase 1.

**Outstanding pre-implementation action**: none. The constitution amendment (v1.1.2 → v1.2.0) landed on 2026-05-17; the broadened form-runtime clause is now in force.

**Conclusion**: Constitution Check **PASSES** post-design. No blockers to `/speckit.tasks`.

