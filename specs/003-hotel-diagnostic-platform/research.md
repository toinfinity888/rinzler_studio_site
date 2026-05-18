# Phase 0 Research: Hotel Diagnostic Platform

This document resolves the technology choices left implicit in [plan.md](./plan.md), each with the decision made, why it was made, and what was rejected.

## R1 — External Scanner: which browser-automation + Lighthouse driver?

**Decision**: Playwright (headless Chromium) with `lighthouse` driven via the Chrome DevTools Protocol session that Playwright already exposes. Cheerio for non-render-time HTML/JSON-LD parsing.

**Rationale**:

- The scan needs both **rendered DOM** (for booking-button destination, mobile-viewport friction, embedded booking-engine widgets) and **performance metrics** (Core Web Vitals via Lighthouse). Playwright drives both from one process: open page → wait for network idle → query DOM → trigger Lighthouse on the same CDP session.
- Lighthouse + Puppeteer also work, but Playwright has better TypeScript ergonomics and a more stable API across Chromium versions. The `audit/` codebase already uses Playwright for E2E, so we get one browser binary for two purposes.
- Cheerio is the right tool for JSON-LD schema extraction, FAQ heuristic detection, multilingual hreflang detection — operations that don't need a live DOM and would be wasteful in Playwright.

**Alternatives considered**:

- **Puppeteer**: rejected — same capability, weaker DX, and we'd have a second browser-automation lib alongside the existing Playwright E2E suite.
- **PageSpeed Insights API**: rejected — Google-hosted (non-EU control plane for the call), introduces a third-party dependency on Google for every free scan, and gives us a Lighthouse report we can't enrich with our own heuristics (FAQ detection, vendor fingerprinting).
- **wappalyzer-cli** for vendor fingerprinting: rejected as a primary tool but used as **inspiration** for our own heuristic set; we maintain a curated set of fingerprints in `audit/lib/scanner/fingerprints/` (specific script src patterns, iframe origins, booking-engine URL patterns) so we can extend it for French-market vendors (D-EDGE, Amenitiz, etc.) that mainstream tools underrepresent.

**Operational notes**: Each scan runs in a fresh Playwright browser context (no cookie/localStorage leakage between scans). Scans run in the `scan.worker.ts` process with a concurrency cap of 4 to fit a typical Clever Cloud Node app.

---

## R2 — AI inference provider with EU residency

**Decision**: Anthropic Claude (Opus 4.7 for high-stakes reasoning, Sonnet 4.6 for higher-throughput tasks) via **AWS Bedrock in `eu-central-1` (Frankfurt)**.

**Rationale**:

- Anthropic Claude is the strongest fit for the platform's reasoning needs: long context (the vendor database + hotel context + questionnaire answers can exceed 100K tokens), reliable structured-output via tool use, prompt caching (critical for cost — the vendor DB and the scoring rubric are stable across thousands of audits), and conservative refusal behavior that avoids producing recommendations the platform cannot defend.
- **Frankfurt is EU territory** — data transfer rules under GDPR are satisfied without an SCC (the data stays in the EEA). AWS publishes a Bedrock-specific DPA. Anthropic confirms training data is not extracted from Bedrock customer traffic.
- AWS Bedrock supports **prompt caching** in Frankfurt (rolled out in early 2026), which cuts cost dramatically on the stable-prefix prompts we use (vendor catalogue, question catalogue, scoring rubric).
- The platform stays provider-portable: a thin `audit/lib/ai/` adapter exposes `reasonAboutRecommendation()`, `extractFromTranscript()`, `summarizeLearnedPattern()` — implementation can swap to Mistral Large on Scaleway, OpenAI on Azure EU, or self-hosted Llama on Clever Cloud GPU instances without changing call sites.

**Alternatives considered**:

- **Anthropic API direct (US)**: rejected — violates Principle I (no PII transmission to non-EU control plane without justification) and the Audit Sub-Stack's France/EU residency clause.
- **Mistral Large on Mistral's own EU cloud**: viable backup. Slightly weaker on long-context reasoning over the vendor DB; structured-output is good but less mature than Claude tool-use. Captured as the documented fallback.
- **OpenAI on Azure EU**: viable but adds a Microsoft trust relationship the studio currently doesn't have; quality on long-context structured reasoning is comparable.
- **Self-hosted Llama 4 / Mixtral**: rejected for V1 — operational burden (GPU instance management, observability, eval pipeline) exceeds the diagnostic platform's GTM budget. Reconsider once audit volume justifies it.

**PII handling**: A redaction step in `audit/lib/ai/redact.ts` strips: hotelier's personal name, contact email, phone, named guests appearing in voice transcripts, and any verbatim staff names. The redacted payload is what Bedrock sees. Audit-log records WHICH redactions were applied per call.

---

## R3 — Voice transcription with no audio persistence

**Decision**: Deepgram (EU region) with streaming WebSocket, configured `keep_audio=false`.

**Rationale**:

- The clarification from `/speckit.clarify` (Q5) is non-negotiable: raw audio MUST NOT be persisted. This rules out any provider that requires posting a complete audio file (Whisper API, AssemblyAI's async endpoint) because the file lives on the provider's storage for some retention window even when set to "no training."
- Deepgram supports **streaming** transcription over WebSocket with **EU data residency** and a documented `keep_audio=false` mode where audio frames are processed in-flight and not durably stored.
- Deepgram has first-class **French** support (matches our market), and supports English (matches our second-language target).
- Streaming also gives a better UX: the transcript appears as the hotelier speaks, they see what's being captured in real time, and they can stop or restart cleanly.

**Alternatives considered**:

- **OpenAI Whisper API**: rejected — async-only at scale, audio retained on OpenAI infrastructure briefly (against the explicit FR-013 "audio MUST NOT be persisted").
- **AssemblyAI Realtime**: viable but currently US-only for the realtime endpoint; their EU pipeline is async.
- **Web Speech API (browser-native)**: rejected as primary — accuracy varies wildly across browsers, French quality is uneven, and we cannot guarantee the contract; kept as a **fallback** for users whose browsers expose it and whose network is too constrained for the streaming session.
- **Self-hosted whisper.cpp on a Clever Cloud worker**: viable but adds GPU/CPU cost per minute of audio and operational complexity we don't need at V1 volumes; reconsider if audit volume makes Deepgram billing material.

**Architecture**: The browser opens a WebSocket directly to Deepgram (no audio passes through our server). The server issues a short-lived (60 s) session token via `audit/lib/transcribe/`. The browser sends audio frames; Deepgram returns transcript fragments; the browser displays them and POSTs the final transcript to our server when the hotelier confirms. Server then runs the structured-extraction prompt (R2) against the transcript.

---

## R4 — Background-job runtime

**Decision**: BullMQ on Redis (Redis hosted in France on Clever Cloud Managed Redis).

**Rationale**:

- BullMQ is Node-native, plays cleanly with the existing TypeScript stack, and supports the job patterns we need: delayed jobs (scheduled enrichment review reminders), recurring jobs (nightly learning aggregation, daily purge sweep), priority queues (interactive scan jobs ahead of nightly enrichment), and rate limiting (per-IP scan rate limit). Job results are accessible from the web tier via the same Redis connection.
- **Redis stays in France** on a managed instance — no data residency concern.
- The worker process is a simple `node` process and deploys identically to the Next.js app: same Dockerfile (or Clever Cloud `package.json` start config), different entry point. One mental model.

**Alternatives considered**:

- **Inngest, Trigger.dev**: rejected — non-EU control plane, violates Principle I.
- **PostgreSQL-backed queues (pg-boss, river)**: viable, removes one infrastructure dependency. Rejected for V1 because BullMQ's developer ergonomics, retry/backoff primitives, and rate-limiter API are significantly more mature; the Redis cost is small. Reconsider for V2 if Redis becomes a maintenance burden.
- **Vercel Cron + Edge Functions**: rejected — non-EU control plane and incompatible with long-running Lighthouse scans.

---

## R5 — Database: Postgres replacing MySQL

**Decision**: Migrate `audit/` from MySQL to Postgres 16. Stay on Drizzle ORM.

**Rationale**:

- The constitution permits Postgres without amendment. The current MySQL choice in `audit/package.json` is itself a divergence from the constitution's original SQLite default; this plan corrects that divergence in a direction the constitution explicitly sanctions.
- **`jsonb`** is materially better than MySQL's JSON for the dynamic questionnaire (conditional logic, translations, scoring contribution rules), the vendor database (per-field provenance records, per-vendor flexible attributes), and the report snapshot (frozen `jsonb` blob captured at publication time per FR-094).
- **Materialized views** are the right tool for the learning loop (aggregate patterns across thousands of audits). MySQL has no native materialized views.
- **`pgvector`** is available natively in Postgres 16. We don't ship embeddings-based matching in V1, but having the extension installed keeps the door open without another migration.
- **Drizzle migrations** work identically against either DB; the application code that uses Drizzle's query builder is nearly source-compatible (`mysql2` → `pg` driver swap, plus a handful of column-type changes captured in the migration script).

**Migration plan**:

- `audit/scripts/migrate-mysql-to-postgres.ts` is a one-shot, idempotent script: it reads from the live MySQL, writes to a fresh Postgres, validates row counts and per-table checksums, then renames the application's connection string.
- The cutover happens during a planned maintenance window (the production `audit/` has 0 sessions to lose at this point; the migration is low-risk).
- Backups: both DBs are dumped before the cutover; both dumps are kept for 30 days post-cutover.

**Alternatives considered**:

- **Stay on MySQL**: rejected — see Complexity Tracking in plan.md.
- **SQLite**: rejected — cannot host the worker concurrency profile in a multi-process deployment.

---

## R6 — Hosting target

**Decision**: Clever Cloud (France) for both the Next.js app and the BullMQ workers, with Clever Cloud Managed Postgres and Managed Redis. Scaleway Object Storage Paris for blob storage (PDFs, funding briefs). Bedrock Frankfurt for AI; Deepgram EU for transcription.

**Rationale**:

- Clever Cloud is sovereign, French, supports Node.js apps + Postgres + Redis + scheduled jobs natively. The constitution explicitly lists Clever Cloud as the documented fallback for the audit platform; given this feature's footprint, it becomes the primary target.
- Scaleway Object Storage is S3-compatible and Paris-hosted, which keeps object storage in France as well.
- All control planes (CI, observability) MUST also be EU-hosted (e.g., Sentry EU, Plausible). No US-hosted SaaS dashboard touches PII.

**Alternatives considered**:

- **o2switch cPanel**: rejected for this feature — cannot host the Redis + worker + Postgres footprint as a clean unit; the marketing site stays on o2switch.
- **Scaleway Serverless Containers**: viable, slightly more operational overhead than Clever Cloud's app-runtime model. Captured as a fallback if Clever Cloud's pricing becomes a constraint at scale.
- **OVHcloud**: viable, weaker DX for the Node app + managed Redis combo at the scale we need. Captured as a fallback.

---

## R7 — Recommendation engine: rule-based vs LLM-only vs hybrid

**Decision**: Hybrid — deterministic rules generate the candidate set, LLM (R2) ranks, explains, and synthesizes scenarios.

**Rationale**:

- **Determinism matters for trust** (FR-110, FR-113, SC-010): every recommendation must enumerate the signals that informed it. A pure-LLM engine cannot guarantee that. A rule-based engine can.
- **LLM matters for explanation** (FR-032): a rule says "tool X matches the hotel's budget and goal"; the LLM turns that into "Tool X appears to be a strong option if your priority is centralizing guest communication and reducing manual replies. It fits your hotel size and budget, but implementation will require staff training and confirmation of PMS integration." The latter is what hoteliers read and trust.
- The hybrid splits the labor: rules in `audit/lib/recommend/rules/` define eligibility, scoring weights, and exclusions; the LLM in `audit/lib/ai/` produces the explanation and the scenario narrative. The signals enumeration always comes from the rules, never from the LLM.

**Operational notes**:

- Rules are versioned (FR-104 spirit applied to scoring): a rule change does not silently rewrite past published reports.
- The LLM's output is constrained by JSON schema (Claude tool use). The platform refuses to publish a report if the LLM output fails validation.
- Recommendation confidence = MIN(rule-derived confidence, LLM-stated confidence). Conservative by design.

---

## R8 — Compliance & risk layer: how to surface findings without giving legal advice

**Decision**: Library of plain-language risk findings (`audit/lib/compliance/`) keyed by signal patterns, each carrying a short non-prescriptive explanation and a checklist item. Findings are surfaced in the report and are also rolled into the recommendation engine to reduce confidence on recommendations whose underlying vendor has unknown compliance posture (FR-053).

**Rationale**:

- Findings are explicitly framed as "risk areas to verify" rather than legal conclusions. FR-052 disclaims legal advice in every rendered checklist.
- The compliance findings library is curated, not LLM-generated, so it remains predictable and auditable.

**Alternatives considered**:

- Let the LLM generate compliance findings ad hoc: rejected — hallucination risk on legal-adjacent content is unacceptable.

---

## R9 — Voice-transcript privacy: what about the transcript itself?

**Decision**: The transcript is stored under the project's retention policy (FR-166), but the hotelier is shown the transcript and the structured extraction BEFORE either is committed (FR-013). The hotelier can edit the transcript or discard the voice answer entirely.

A coarse pattern-matched redaction pass runs server-side over the transcript before storage and before AI reasoning: detects and masks IBANs, payment card numbers, French national-ID-like numbers, and obvious email/phone patterns embedded in the speech. The redacted transcript is what enters durable storage and the AI reasoning prompt. The audit log records that the redaction pass ran and which categories it matched.

**Rationale**:

- Even with the hotelier's review, an inadvertent verbatim ("guest X told me about her medical condition…") could land in storage. Coarse pattern redaction defends against the most common high-sensitivity categories.
- The categories are conservative — false positives result in masked tokens (`[REDACTED:PHONE]`) which the hotelier can correct, far better than false negatives.

---

## R10 — Internationalization storage model

**Decision**: Per-row, per-language. Three i18n surfaces:

1. **UI strings** — continue using the existing `audit/lib/form-schema/fr.ts` pattern, extended with `en.ts` for the second language. Static, version-controlled in TypeScript, no DB. The dynamic questionnaire does NOT live here.
2. **Questionnaire content** — DB-backed (`question_translations` table), one row per (question_version, language). Fallback to canonical French when a translation is missing (FR-104).
3. **Vendor content** — DB-backed (`vendor_translations` table) for the human-readable fields (description, strengths, limitations, when-to-recommend, when-not-to-recommend). Decision-relevant *structured* fields (price tier, integrations, GDPR posture) are language-agnostic and live on the canonical `vendors` row.

**Rationale**:

- Splitting structured fields from human-readable fields means a missing translation doesn't break recommendations; only the rendered text falls back.
- The (entity, language) row pattern is idiomatic Drizzle, plays well with `jsonb` for the structured side, and avoids a EAV pattern.

---

## R11 — Free-scan rate limiting

**Decision**: Per-IP token bucket on the anonymous scan endpoint (`/api/scan/start`), enforced via BullMQ's built-in rate limiter and the existing in-memory IP rate limit pattern in `audit/lib/auth/`. Default: 5 scans per IP per hour, with a global per-minute ceiling on the worker. Visible-to-the-user cooldown message when exceeded.

**Rationale**:

- The free-scan landing is the most attackable surface (public, expensive per request due to Playwright + Lighthouse). Per-IP throttling is the simplest effective defense against drive-by abuse and keeps the worker queue healthy.
- A second-layer rate limit on the recently-scanned URL itself (FR-006 already permits scan reuse) means repeat scans for the same URL within the freshness window short-circuit and serve cached findings — cheap.

---

## R12 — Published report immutability mechanism

**Decision**: At publication time, a `report_snapshot` row is written containing the rendered report content (executive summary text, scores, opportunity map, scenarios, recommendations with attached explanations, tool shortlist, "what not to do now," impact analysis, roadmap, compliance checklist, next steps) plus the IDs of every vendor entry, question version, scoring rule version, and rule-engine version that participated. The snapshot is what the report URL serves — never the live data.

**Rationale**:

- FR-094 and SC-020 require past reports to render the same content forever. A snapshot is the simplest reliable implementation; queries against the live DB would risk silent drift.
- Storing IDs of participating versions (not just the values) lets us reconstruct *why* a recommendation was made even years later, when the live entries have evolved.

---

## R13 — Aggregate-learning privacy

**Decision**: Materialized views aggregate over projects but never expose project IDs, hotel names, or any free-text answer. The aggregation is keyed by (hotel-profile-segment, goal, declared-stack-pattern) → counts and outcome rates. The "drill-down" view available to authorized super-admins respects FR-133 by hiding identity unless the super-admin explicitly switches to a per-project consultant-authorized view.

**Rationale**:

- Lets the platform satisfy FR-130–FR-133 without leaking identifying data, even to internal team members in default views.

---

## R14 — Long-term integration layer (US 14)

**Decision**: Implement the integration hub as a separate logical subsystem under `audit/lib/integrations/` and `audit/app/admin/integrations/`, scheduled for delivery after the diagnostic + recommendation layers are mature. The data model captures `IntegrationWorkflow` rows from V1 (so reports can reference planned workflows), but actual execution machinery (n8n-style flow runtime, vendor API connectors) is documented but not built as part of this feature's task set.

**Rationale**:

- Per the user's instruction that the spec covers the full project without staging, the SPEC includes US 14. The PLAN scopes the V1 build to: schema + admin scaffolding for `IntegrationWorkflow` records, plus the report-side surfaces that reference them.
- The actual workflow runtime is a multi-quarter undertaking that is intentionally deferred; it does not block any P1 user story.
- This is captured here, not in the spec, because it is a planning-tier decision.

---

## Open questions deferred to `/speckit.tasks`

These are operational tuning decisions, not architectural unknowns. They will be set in `tasks.md` based on what the team prefers:

- Exact freshness window for scan cache reuse (default proposal: 30 days).
- Exact freshness window for vendor entries (default proposal: 180 days).
- Default Plausible event payload fields per event.
- Concurrency cap for the scan worker per Clever Cloud instance (default proposal: 4).
- Per-tier rate ceilings for the AI worker.
- The N in SC-019 (corpus threshold for surfacing learned patterns; default proposal: 50 per hotel-profile segment).
