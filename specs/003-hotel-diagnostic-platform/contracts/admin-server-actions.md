# Contract: Admin (Authenticated) Server Actions

Reachable from `/admin/*` after NextAuth session validation. Every action checks the caller's effective role set (`user_roles` union per Clarification Q4) and rejects with 403 if the required role isn't held. Every action writes an `audit_log` entry.

---

## Roles → capability map

| Capability | Required role(s) (any of) |
|---|---|
| List / open any project | `consultant`, `super_admin` |
| Create a project, generate a client link, revoke a link | `consultant`, `super_admin` |
| Override a client answer (consultant mode) | `consultant`, `super_admin` |
| Publish a consultant-tier report | `consultant`, `super_admin` |
| Create / edit / retire vendor entries | `vendor_database_admin`, `super_admin` |
| Create / edit / deactivate / publish questions | `questionnaire_admin`, `super_admin` |
| Accept / reject candidate enrichments | `vendor_database_admin`, `super_admin` |
| Promote / dismiss a learned pattern | `vendor_database_admin`, `questionnaire_admin`, `super_admin` |
| Manage team users + role grants | `super_admin` only |
| Execute a hotelier-deletion request | `super_admin` |

---

## Projects & engagements

### `createProject(input)`

**Payload**: `{ label, hotel: { url, name?, country?, region?, room_count? }, contact_email?, tier, priority? }`.

**Behavior**:
1. Validate tier.
2. Resolve or create the persistent `Hotel` row (FR-167): canonicalize URL, look up by `canonical_url`; create if absent (since tier is mini-or-above).
3. Create the `projects` row, link to the hotel.
4. Generate a token (256-bit), hash and store; return the clear token once.
5. Pre-fill any provided fields onto `answers` with `source = 'admin_prefill'`.

### `revokeClientLink(projectId)`

Sets `projects.token_revoked_at = now()`. Subsequent client visits 404.

### `reopenProject(projectId)`

Allowed only by `super_admin` or the project's owning consultant. Resets status to `in_progress`; existing answers preserved. `audit_log` records the reopen.

### `executeHotelierDeletion(hotelId, requestId)`

**Behavior**:
1. Cascade delete: `hotels` → `projects` → `submissions` → `answers` → `voice_captures` → `scenarios` → `recommendations` → `readiness_scores` → `roadmap_items` → `compliance_findings` → `funding_briefs` → `report_snapshots` (PDFs in object storage soft-deleted) → `knowledge_base_entries` → `performance_metrics` → `integration_workflows` → `implementation_steps`.
2. Scrub identifying fields in `audit_log` rows referencing this hotel (the audit-log carve-out: rows remain, identifying metadata is replaced with `[REDACTED:deletion-2026-XX-XX]`).
3. Write a final `audit_log` entry: action `deletion_executed`, `actor_id`, `target_type = hotel`, `metadata_json = { request_id, scope: 'full', categories_scrubbed: [...] }`.

---

## Consultant workspace (US 4)

### `applyConsultantOverride(projectId, questionSlug, overrideValue, reason)`

**Behavior**:
1. Insert a new `answers` row with `source = 'consultant_override'`, `overrides_answer_id` pointing at the original client answer.
2. Re-derive any dependent answers / conditional questions.
3. Enqueue a partial reasoning recompute (only impacted recommendations are re-evaluated, not the whole audit).
4. Append a private `internal_notes` row with `target_type = 'project'` capturing the `reason`.

### `adjustScenarioWeights(projectId, scenarioId, weightAdjustments)`

Allows the consultant to suppress or boost specific recommendation lines within a scenario, with a private justification note.

### `publishConsultantReport(projectId)`

**Behavior**:
1. Render the final `report_snapshots` row.
2. Strip everything `internal_notes` and all `consultant_override.reason` text from the rendered snapshot — only the curated public content is published (FR-072, SC-017).
3. Trigger PDF render via `report.worker.ts`.
4. Notify the client via the email captured at link generation (if present).

---

## Vendor database (US 5)

### `createVendor(input)` / `updateVendor(vendorId, patch)`

**Behavior**:
1. Validate all required fields.
2. Each field that has changed produces a new `provenance_records` row (FR-024).
3. On `updateVendor`, a new `vendor_versions` row is appended (FR-023); active recommendations referencing the prior version are NOT silently updated.

### `retireVendor(vendorId)`

Sets `status = 'retired'`. Historical recommendations (already-published reports) keep rendering the retired vendor. New shortlists exclude it.

### `filterVendors(query)`

Returns vendor rows filtered by category, tags, target hotel size, country, language, GDPR posture, EU hosting, French-market relevance, freshness window — supports bulk operations.

### `compareVendorsSideBySide(vendorIds[])`

Returns a structured comparison used in both the admin UI and the implementation-tier vendor-selection view (FR-141).

---

## Questionnaire management (US 6)

### `createQuestion(input)` / `updateQuestion(questionId, patch)`

**Behavior**:
1. Updates produce a new `question_versions` row (never edit in place).
2. The new version is created as `status = 'draft'` until explicitly published.
3. Translations are recorded per-language in `question_translations`.

### `publishQuestionVersion(questionVersionId)`

Sets the parent `questions.current_version` to this version's number. Existing audits in progress keep rendering the version they were rendering before (per FR-103).

### `deactivateQuestion(questionId)`

Stops the question appearing in new audits; preserves it in historical reports.

### `previewQuestionnaire(simulatedProfile)`

Runs a dry render with a fake project profile (FR-102). Output is read-only; nothing is persisted; no Plausible event fires.

---

## Candidate enrichment review (US 11)

### `listCandidateEnrichments(filter)`

Returns the team review queue (FR-121).

### `acceptCandidateEnrichment(candidateId, edits?)`

**Behavior**:
1. Merge the proposed changes into the target vendor entry (new `vendor_versions` row).
2. Source label upgrades from `client_reported` to `consultant_verified` (FR-122).
3. Set `candidate_enrichments.status = 'accepted'`.

### `rejectCandidateEnrichment(candidateId, reason)`

Status to `rejected`; preserved for traceability.

---

## Learned patterns review (US 12)

### `listLearnedPatterns(filter)`

### `promoteLearnedPatternToRule(patternId, ruleDraft)`

Promotes the pattern into an explicit rule in `audit/lib/recommend/rules/` via an auto-generated PR (or a DB-stored rule row if the rule is data-driven). Records `learned_patterns.status = 'promoted_to_rule'`.

### `dismissLearnedPattern(patternId, reason)`

---

## Implementation tier (US 13)

### `upsertKnowledgeBaseEntry(hotelId, payload)`

Knowledge base lives on the **hotel**, not the project — it outlives a single audit and is reusable across audits, AI agents, website FAQ generation, etc. (FR-143).

### `markImplementationStepDone(stepId)` / `recordPerformanceMetric(hotelId, payload)`

Drive the post-implementation progress and performance views (FR-142).

---

## Long-term integration layer (US 14)

### `createIntegrationWorkflow(hotelId, definition)`

V1: persists the workflow definition only. The runtime execution is documented but not built in this feature.

---

## User & role management (FR-162)

### `createUser(email, displayName, initialPasswordReset)`

`super_admin` only.

### `grantRole(userId, role)` / `revokeRole(userId, role)`

Roles are individually grantable / revocable per Clarification Q4. Each grant produces an `audit_log` entry.

---

## Common contract guarantees

- Every state mutation is wrapped in a DB transaction with the corresponding `audit_log` write.
- Every action returns `{ ok: true, ... }` on success or `{ ok: false, error: { code, message } }` on validation failure (HTTP status 200 for both, since these are server actions, not REST). Authorization failures return HTTP 403.
- No action accepts free-text that is fed unredacted into AI prompts; the redaction step (R9) is enforced in `audit/lib/ai/redact.ts`.
- Internal notes and override reasons are NEVER exposed in any client-facing payload.
