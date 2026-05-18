# Contract: Background Worker Jobs (BullMQ)

All jobs run in `audit/workers/*.ts` against the Postgres + Redis stack. Job inputs are typed (Zod-validated at the queue boundary). Each job is idempotent on a documented key so retries are safe.

---

## Queue: `scan`

### Job: `scan.run`

**Worker**: `scan.worker.ts`. Concurrency cap: 4 per instance. Default attempts: 2 with exponential backoff.

**Input**:
```ts
{
  scan_id: string;
  url: string;
  canonical_url: string;
  project_id: string;
}
```

**Behavior**:
1. Update `scans.status = 'running'`, `started_at = now()`.
2. Open a fresh Playwright Chromium context. Navigate to `url` with a desktop UA and a 30 s navigation timeout.
3. Capture: rendered DOM, network log, JSON-LD `<script>` contents, all `<link>` and `<a>` targets, embedded iframes, manifest, robots.txt and sitemap.xml fetch.
4. Run Lighthouse against the same CDP session: performance, accessibility, best-practices, SEO categories.
5. Re-load with a mobile emulation profile (iPhone 13) and re-measure LCP/CLS — drives the "mobile booking-path friction" signal.
6. Run vendor fingerprinting (`audit/lib/scanner/fingerprints/`) against script srcs, iframe origins, booking-button hrefs.
7. Map raw observations into `scan_findings` rows (one per signal) with confidence and evidence.
8. Update `scans.status = 'succeeded'`, `finished_at = now()`, `fingerprint_summary` set.
9. Emit Plausible event: `scan_completed`.

**Failure modes**:
- Captcha / login wall detected → `status = 'blocked'`, `error_class = 'captcha_blocked'` or `'login_wall'`. Findings populated up to the block.
- Network unreachable → `status = 'failed'`, `error_class = 'unreachable'`.
- Non-hotel heuristic (no hotel schema, no booking signals, no hospitality keywords) → `status = 'succeeded'` but `error_class = 'non_hotel'` and a single guiding observation surfaced.

**Idempotency**: keyed on `scan_id`. Re-running overwrites findings for the same `scan_id`.

---

## Queue: `ai`

### Job: `ai.reason_project`

**Worker**: `ai.worker.ts`. Concurrency cap: 8 (Bedrock-side rate limits dominate). Default attempts: 3.

**Input**:
```ts
{
  project_id: string;
  trigger: 'audit_submitted' | 'consultant_recompute' | 'override_applied';
  scope: 'full' | 'partial';
  partial_recommendations?: string[];     // recommendation IDs to recompute
}
```

**Behavior**:
1. Load: project, hotel, answers (with version pins), scan findings, eligible vendors (rules-based pre-filter from `audit/lib/recommend/rules/`).
2. Redact (R9) any free-text inputs before they reach the prompt.
3. Build the prompt with stable-prefix sections (vendor catalogue snapshot, scoring rubric, question catalogue) — these are **prompt-cached** in Bedrock.
4. Call Claude (Opus 4.7 for full-tier audits; Sonnet 4.6 for mini-tier) with tool use enforcing the structured output schema in `ai-prompts.md`.
5. Validate the LLM response against the JSON schema. Reject and retry once on validation failure.
6. Persist: `scenarios`, `recommendations`, `readiness_scores`, `roadmap_items`, `compliance_findings`.
7. Snapshot the participating vendor & question versions onto each recommendation row.
8. For self-service tiers, render the `report_snapshots` row and enqueue `report.pdf`.
9. Emit Plausible event: `report_generated`.

**Cost guardrails** (R2):
- Prompt cache hit rate target: > 80 % on the stable-prefix sections.
- Per-project AI spend ceiling: €3 (kill switch if exceeded; fall back to rules-only output for that project, surface a banner to the consultant).

**Idempotency**: keyed on `(project_id, trigger, rule_engine_version)`.

### Job: `ai.extract_voice_structure`

**Worker**: `ai.worker.ts`.

**Input**:
```ts
{
  voice_capture_id: string;
  transcript_post_edit: string;
  language: string;
  context: { question_slug: string; project_id: string };
}
```

**Behavior**: Calls Claude (Sonnet) to extract the structured shape (topics, channels, current_process, automation_opportunity, candidate_solution_category). Writes `voice_captures.structured_extraction`. Emit `voice_extraction_completed`.

### Job: `ai.summarize_pattern`

Called by `learning.worker.ts` after the materialized view refresh; turns a raw aggregate row into a plain-language observation for team review.

---

## Queue: `enrichment`

### Job: `enrichment.extract_from_audit`

**Worker**: `enrichment.worker.ts`. Concurrency: 4.

**Input**: `{ project_id: string }`.

**Behavior**:
1. Compare the project's mentioned vendors against the `vendors` table.
2. For each mentioned vendor not in the DB, create a `candidate_enrichments` row with `target_entity_type = 'vendor'`, `target_vendor_id = NULL`, and a skeleton derived from the project's answers.
3. For each mentioned vendor present in the DB, compare reported features / limitations / pricing against the vendor entry and queue per-field candidate enrichments where they diverge.
4. Source label: `client_reported`.

**Idempotency**: keyed on `project_id`; re-running replaces any prior `pending` candidates from the same project, never replaces `accepted` / `rejected` ones.

---

## Queue: `learning`

### Job: `learning.refresh_views`

**Worker**: `learning.worker.ts`. Schedule: nightly at 03:00 Europe/Paris.

**Behavior**:
1. `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audit_segment_outcomes`.
2. Query the view for segment / observation pairs crossing the configured corpus threshold (SC-019 default N = 50).
3. For each newly-crossed pattern, persist a `learned_patterns` row and enqueue `ai.summarize_pattern` to produce its plain-language observation.

### Job: `learning.adjust_recommendation_confidence`

Reads post-implementation feedback (from `performance_metrics` and consultant follow-up notes) and adjusts rule-level confidence in `audit/lib/recommend/rules/` config tables (FR-132).

---

## Queue: `report`

### Job: `report.pdf`

**Worker**: `report.worker.ts`. Concurrency: 2.

**Input**: `{ report_snapshot_id: string }`.

**Behavior**:
1. Render the `report_snapshots.rendered_json` content into a paginated PDF using `pdfkit`.
2. Upload to Scaleway Object Storage Paris with a key like `reports/{project_id}/{snapshot_id}.pdf`.
3. Set `report_snapshots.pdf_object_key`.
4. Emit `report_pdf_ready` event.

**Idempotency**: keyed on `report_snapshot_id`. Re-runs overwrite the same object key.

---

## Queue: `purge`

### Job: `purge.daily_sweep`

**Schedule**: daily at 04:00 Europe/Paris.

**Behavior** (FR-166):
1. Find `projects` with `tier = 'free_scan'` and `purge_after < now()`. Delete cascade. Emit one `project_purged` audit-log entry per project.
2. Process queued hotelier-deletion requests: see `executeHotelierDeletion` in admin-server-actions.md.
3. Process pending email follow-up jobs that have aged out.

**Idempotency**: re-running on the same day is harmless (the `purge_after < now()` filter ensures nothing un-purged is touched).

---

## Cross-cutting

| Concern | Mechanism |
|---|---|
| Retry policy | BullMQ exponential backoff with attempts capped per queue (above). |
| Dead-letter | Failed jobs after retries land in a `:failed` set; `learning.worker.ts` polls daily and pages the on-call team. |
| Observability | OpenTelemetry traces per job; logs to Sentry EU. No PII in logs. |
| Concurrency caps | Set per-queue at the worker; Redis-side global rate limits configured via BullMQ `limiter`. |
| Graceful shutdown | SIGTERM drains in-flight jobs (Lighthouse cannot be cleanly interrupted, so we wait up to 60 s). |
| Idempotency keys | Each job spec above names its key — must be respected by call sites. |
