# Phase 1 Data Model: Hotel Diagnostic Platform

**Target**: Postgres 16, accessed via Drizzle ORM. All tables include `created_at` / `updated_at` `timestamptz` columns unless noted. All primary keys are `uuid` v7 (sortable) unless noted. All `jsonb` columns specify their internal shape inline. Foreign keys use `ON DELETE` rules captured per relationship.

This document covers the **new** entities introduced by feature `003-hotel-diagnostic-platform` and the extensions to entities already present in feature `001-hotel-audit-platform`. The full schema is the union of both.

---

## A. Identity & Hotel Continuity

### `hotels` (NEW)

The persistent hotel record introduced by Clarification Q1 (Hybrid identity). Created or linked when a project reaches the mini tier or above. NOT created for anonymous free scans.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `canonical_url` | `text NOT NULL` | Normalized (lowercase, no trailing slash, no www) for matching. UNIQUE constraint. |
| `display_name` | `text` | Hotelier-supplied. Nullable until first project completes. |
| `country` | `text` | ISO-3166 alpha-2. |
| `region` | `text` | |
| `city` | `text` | |
| `property_type` | `text` | Enum: independent / boutique / family / aparthotel / guesthouse / small_group. |
| `star_rating` | `smallint` | 1–5; nullable for unclassified. |
| `room_count` | `int` | |
| `primary_language` | `text NOT NULL DEFAULT 'fr'` | |
| `latest_project_id` | `uuid` FK → `projects.id` | Convenience pointer to the most recent project for this hotel; NULL until first project completes. |
| `created_at`, `updated_at` | `timestamptz` | |

**Indexes**: unique on `canonical_url`; btree on `(country, region)`.

### `projects` (EXTENDED from 001)

| Column added | Type | Notes |
|---|---|---|
| `hotel_id` | `uuid` FK → `hotels.id` ON DELETE RESTRICT | NULL for anonymous free-scan projects (FR-167). NOT NULL for projects at mini tier or above. |
| `tier` | `text NOT NULL` | Enum: free_scan / mini / full / consultant_assisted / implementation. |
| `goal_primary` | `text` | Enum: profitability / workload_reduction / direct_bookings / guest_satisfaction / ai_readiness / pms_evaluation / reviews / processes / ota_dependency / modernize / other. |
| `goal_secondary` | `text[]` | |
| `budget_level` | `text` | Enum: none / low / moderate / high / open_if_roi_clear / unsure. |
| `purge_after` | `timestamptz` | Auto-set for free_scan projects to `created_at + 90 days`. NULL for mini-tier-and-above. Drives FR-166. |

**Status enum** is expanded to: `draft`, `awaiting_client`, `in_progress`, `submitted`, `consultant_finalized`, `published`, `archived`.

---

## B. Scanner Subsystem

### `scans` (NEW)

A single scan run against a single URL.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `url` | `text NOT NULL` | The submitted URL. |
| `canonical_url` | `text NOT NULL` | Normalized form used for cache reuse (FR-006). |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | NULL while the scan is still anonymous; populated once attached to a project. |
| `status` | `text NOT NULL` | Enum: queued / running / succeeded / failed / blocked. |
| `started_at`, `finished_at` | `timestamptz` | |
| `error_class` | `text` | NULL on success. Enum: unreachable / captcha_blocked / login_wall / non_hotel / scanner_error. |
| `fingerprint_summary` | `jsonb` | `{ "booking_engine": "d_edge", "pms_hint": null, "channel_manager": null, ... }` — pre-rendered for index UI. |
| `freshness_expires_at` | `timestamptz` | `started_at + cache window` (default 30 days). Used for FR-006 reuse. |

### `scan_findings` (NEW)

Field-level structured findings. One row per signal.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `scan_id` | `uuid` FK → `scans.id` ON DELETE CASCADE | |
| `field` | `text NOT NULL` | E.g., `booking_button_target`, `schema_hotel_present`, `whatsapp_visible`, `lcp_ms`, `cls`, `vendor_booking_engine`. |
| `value_json` | `jsonb NOT NULL` | Polymorphic (`boolean`, `number`, `string`, `object` depending on signal). |
| `evidence` | `jsonb` | `{ "selector": "...", "snippet": "...", "url": "..." }` — what proved the finding. |
| `confidence` | `text NOT NULL` | Enum: high / medium / low. |
| `observed_at` | `timestamptz NOT NULL` | |

**Indexes**: btree on `(scan_id, field)`; gin on `value_json` for ad-hoc analytics.

---

## C. Dynamic Questionnaire

### `questions` (NEW)

Question metadata, language-agnostic.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text NOT NULL UNIQUE` | Stable identifier (e.g., `pms_vendor`). |
| `block` | `text NOT NULL` | Enum matching FR-017 blocks: profile / goal / stack / website / communication / operations / knowledge_ai / reviews / ai_visibility / compliance / budget / pms_deep / goal_branch / prioritization. |
| `answer_type` | `text NOT NULL` | Enum: single / multi / dropdown / slider / ranking / yes_no_unknown / short_text / voice. |
| `audit_levels` | `text[] NOT NULL` | Subset of {free_scan, mini, full, consultant_assisted, implementation}. |
| `hotel_types` | `text[]` | NULL = applies to all. |
| `goal_relevance` | `text[]` | Goals this question is most relevant for. |
| `scoring_contributions` | `jsonb` | Array of `{ score: 'automation_readiness' | ..., weight: number, mapping: {...} }`. |
| `current_version` | `int NOT NULL DEFAULT 1` | |
| `status` | `text NOT NULL` | Enum: draft / published / deactivated. |
| `created_at`, `updated_at` | `timestamptz` | |

### `question_versions` (NEW)

Append-only history. Every publish increments `current_version` on `questions` and writes a new row here. Reopened past audits dereference question text by version (FR-103).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `question_id` | `uuid` FK → `questions.id` ON DELETE RESTRICT | |
| `version` | `int NOT NULL` | |
| `definition_json` | `jsonb NOT NULL` | Full definition at this version (options, conditional logic, scoring contribution). |
| `published_at` | `timestamptz NOT NULL` | |
| `published_by` | `uuid` FK → `users.id` | |

**Unique**: `(question_id, version)`.

### `question_translations` (NEW)

| Column | Type | Notes |
|---|---|---|
| `question_version_id` | `uuid` FK → `question_versions.id` ON DELETE CASCADE | Part of PK. |
| `language` | `text NOT NULL` | ISO-639-1. Part of PK. |
| `prompt` | `text NOT NULL` | The question shown to the hotelier. |
| `helper` | `text` | Tooltip / explanation. |
| `option_labels` | `jsonb` | `{ "option_slug": "Translated label" }` for choice-type questions. |
| `updated_at` | `timestamptz` | |

**Primary key**: `(question_version_id, language)`.

### `question_conditions` (NEW)

Per-version conditional logic. Renderer evaluates these against the current answer set + scan findings to decide whether to show a question.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `question_version_id` | `uuid` FK → `question_versions.id` ON DELETE CASCADE | |
| `expression_json` | `jsonb NOT NULL` | AST-like: `{ "all": [{ "answer": "pms_vendor", "eq": "d_edge" }, { "scan": "booking_engine", "eq": "d_edge" }] }`. |

Multiple rows per `question_version_id` are OR-ed; within a single row, the structure encodes ALL / ANY / NOT.

---

## D. Answers & Voice

### `answers` (EXTENDED from 001)

| Column added | Type | Notes |
|---|---|---|
| `question_version_id` | `uuid` FK → `question_versions.id` ON DELETE RESTRICT | Records the question version this answer was given against. Enables FR-103. |
| `source` | `text NOT NULL` | Enum: client / admin_prefill / consultant_override / voice_extracted / scan_inferred. |
| `confidence` | `text NOT NULL DEFAULT 'high'` | Enum: high / medium / low; "I don't know" answers default to `low` (FR-018). |
| `overrides_answer_id` | `uuid` FK → `answers.id` | NULL unless this is a consultant override; points to the original client answer that is being overridden (FR-072, FR-073). |

Existing `answers.value_json`, `answers.field_id`, `answers.submission_id`, `answers.updated_at` are preserved. `field_id` becomes `question_slug` semantically; existing values are migrated.

### `voice_captures` (NEW)

The non-audio record of a voice answer.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `answer_id` | `uuid` FK → `answers.id` ON DELETE CASCADE | |
| `transcript_post_edit` | `text NOT NULL` | The hotelier-reviewed transcript. NO RAW AUDIO IS PERSISTED (FR-013). |
| `structured_extraction` | `jsonb` | `{ "topics": [...], "channels": [...], "current_process": "...", "automation_opportunity": "...", "candidate_solution_category": "..." }`. |
| `redaction_categories_matched` | `text[]` | Categories the server-side redaction matched (FR-013, R9): phone / email / iban / pan / national_id. |
| `transcription_provider` | `text NOT NULL` | E.g., `deepgram_eu`. |
| `created_at` | `timestamptz` | |

---

## E. Vendor Database

### `vendors` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `slug` | `text NOT NULL UNIQUE` | E.g., `d_edge`, `mews`. |
| `category` | `text NOT NULL` | Enum of 22 categories per FR-020. |
| `official_url` | `text` | |
| `target_hotel_sizes` | `text[]` | E.g., `['small', 'medium']`. |
| `target_property_types` | `text[]` | |
| `countries_served` | `text[]` | ISO-3166. |
| `languages_supported` | `text[]` | ISO-639-1. |
| `independent_hotel_suitability` | `text` | Enum: strong / fair / weak / unknown. |
| `small_hotel_suitability` | `text` | Same enum. |
| `core_features` | `jsonb` | Tagged feature list. |
| `integrations` | `jsonb` | `{ "pms": [...], "booking_engine": [...], "channel_manager": [...], "crm": [...] }`. |
| `api_availability` | `text` | Enum: yes / partial / no / unknown. |
| `automation_capabilities` | `text[]` | |
| `ai_features` | `text[]` | |
| `reporting_capabilities` | `text[]` | |
| `implementation_complexity` | `text` | Enum: low / medium / high. |
| `price_tier` | `text` | Enum: free / entry / mid / premium / enterprise / variable. |
| `support_availability` | `text` | Enum: 24x7 / business_hours / business_days / asynchronous / community. |
| `french_market_relevance` | `text` | Enum: native_fr / strong / present / unknown / weak. |
| `gdpr_posture` | `text` | Enum: dpa_published / dpa_on_request / unclear / unknown / non_compliant. |
| `eu_hosting` | `text` | Enum: confirmed_eu / mixed / non_eu / unknown. |
| `typical_implementation_risks` | `jsonb` | Tagged list. |
| `compatibility_notes` | `text` | Internal. |
| `tags` | `text[]` | Per FR-022. |
| `status` | `text NOT NULL DEFAULT 'active'` | Enum: active / retired. |
| `current_version` | `int NOT NULL DEFAULT 1` | |
| `confidence` | `text NOT NULL` | Field-level confidence is in provenance; this is the entry-level confidence. |
| `created_at`, `updated_at` | `timestamptz` | |

### `vendor_versions` (NEW)

Append-only history (FR-023). Same pattern as `question_versions`.

### `vendor_translations` (NEW)

| Column | Type | Notes |
|---|---|---|
| `vendor_version_id` | `uuid` FK → `vendor_versions.id` ON DELETE CASCADE | Part of PK. |
| `language` | `text NOT NULL` | Part of PK. |
| `description_short` | `text` | |
| `description_long` | `text` | |
| `strengths` | `text[]` | |
| `limitations` | `text[]` | |
| `when_to_recommend` | `text[]` | |
| `when_not_to_recommend` | `text[]` | |

### `provenance_records` (NEW)

Per-field source attribution for vendor data (and reusable for scan findings and answers if needed). Keyed by `(entity_type, entity_id, field_path)`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `entity_type` | `text NOT NULL` | Enum: vendor / scan_finding / answer / candidate_enrichment. |
| `entity_id` | `uuid NOT NULL` | |
| `field_path` | `text NOT NULL` | E.g., `gdpr_posture` or `core_features.guest_messaging`. |
| `source` | `text NOT NULL` | Enum (FR-024): official_vendor / public / consultant_verified / client_reported / ai_inferred / outdated / uncertain. |
| `contributor_id` | `uuid` FK → `users.id` | NULL for non-team sources. |
| `contributor_label` | `text` | E.g., `"vendor official site (FAQ page)"`. |
| `added_at` | `timestamptz NOT NULL` | |
| `last_verified_at` | `timestamptz` | NULL = never verified post-add. |
| `confidence` | `text NOT NULL` | Enum: high / medium / low. |
| `conflict_note` | `text` | When the same field has multiple provenance rows. |

**Indexes**: btree on `(entity_type, entity_id, field_path)`; partial index on rows older than 6 months for staleness reporting.

---

## F. Recommendation Engine Outputs

### `recommendations` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `scenario_id` | `uuid` FK → `scenarios.id` ON DELETE CASCADE | NULL if standalone "quick win." |
| `action` | `text NOT NULL` | Short canonical title. |
| `vendor_id` | `uuid` FK → `vendors.id` ON DELETE SET NULL | NULL if non-vendor recommendation (e.g., "create a knowledge base"). |
| `vendor_version_id` | `uuid` FK → `vendor_versions.id` | Pins the vendor version that informed this recommendation. |
| `explanation_json` | `jsonb NOT NULL` | `{ relevance, problem_solved, change, benefit, effort, risks, check_before, alternatives, do_nothing_consequence }` (FR-032). |
| `impact_json` | `jsonb NOT NULL` | Multi-dimensional impact per FR-040 (13 dimensions). |
| `cost_band` | `text` | Enum from FR-035. |
| `risk_level` | `text` | Enum: low / medium / high. |
| `time_to_deploy` | `text` | Enum: immediate / 30d / 60d / 90d / quarter_plus. |
| `confidence` | `text NOT NULL` | Final, min(rule_conf, llm_conf) per R7. |
| `do_not_do_now` | `boolean NOT NULL DEFAULT false` | Drives FR-033 section. |
| `do_not_do_reason` | `text` | Required when `do_not_do_now = true`. |
| `signals_consulted` | `jsonb NOT NULL` | Enumerated traceability (FR-113): `{ answers: [...], scan_findings: [...], vendor_fields: [...] }`. |
| `rule_engine_version` | `text NOT NULL` | |
| `created_at` | `timestamptz` | |

### `scenarios` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `kind` | `text NOT NULL` | Enum: minimal / balanced / advanced / custom. |
| `title` | `text NOT NULL` | |
| `summary` | `text NOT NULL` | |
| `tradeoffs_json` | `jsonb NOT NULL` | Cross-recommendation summary. |

### `readiness_scores` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `dimension` | `text NOT NULL` | Enum of 9 dimensions per FR-036. |
| `value` | `smallint NOT NULL` | 0–100. |
| `band` | `text NOT NULL` | Enum: low / medium / high. |
| `basis_json` | `jsonb NOT NULL` | Enumerated answers/findings that produced the score (FR-037). |
| `computed_at` | `timestamptz` | |

**Unique**: `(project_id, dimension)`.

### `roadmap_items` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `recommendation_id` | `uuid` FK → `recommendations.id` ON DELETE CASCADE | The action this roadmap item implements. |
| `bucket` | `text NOT NULL` | Enum: immediate / 30d / 60d / 90d / postponed / not_now. |
| `expected_effort` | `text` | Enum: low / medium / high. |
| `expected_impact` | `text` | Enum: low / medium / high. |
| `dependencies` | `uuid[]` | Other `roadmap_items.id`. |
| `recommended_owner` | `text` | Enum: hotelier / consultant / external / shared. |
| `decision_points` | `jsonb` | List of `{ when, question, resolution_options }`. |
| `implementation_risk` | `text` | Enum: low / medium / high. |

### `compliance_findings` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `topic` | `text NOT NULL` | Enum: ai_transparency / dpa_missing / eu_hosting_unknown / consent_management / retention_unclear / ... |
| `severity` | `text NOT NULL` | Enum: info / advisory / risk. |
| `explanation` | `text NOT NULL` | Plain-language. |
| `checklist_item` | `text NOT NULL` | What the hotelier should do. |
| `vendor_id` | `uuid` FK → `vendors.id` ON DELETE SET NULL | When the finding is tied to a specific vendor's posture. |

### `funding_briefs` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | UNIQUE — one brief per project. |
| `content_json` | `jsonb NOT NULL` | Sections per FR-060. |
| `eligibility_disclaimer` | `text NOT NULL` | Standard text, also baked into PDF render. |
| `generated_at` | `timestamptz` | |

---

## G. Report Snapshots

### `report_snapshots` (NEW)

Immutable per FR-094 / SC-020. Once a report is published, the snapshot is what every viewer renders.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `published_at` | `timestamptz NOT NULL` | |
| `published_by` | `uuid` FK → `users.id` ON DELETE SET NULL | NULL for self-service publication. |
| `tier_at_publication` | `text NOT NULL` | Snapshot of the project tier at the moment of publish. |
| `goal_primary_at_publication` | `text` | |
| `rendered_json` | `jsonb NOT NULL` | The complete rendered report content. |
| `referenced_vendor_versions` | `uuid[]` | All `vendor_versions.id` participating. |
| `referenced_question_versions` | `uuid[]` | All `question_versions.id` participating. |
| `rule_engine_version` | `text NOT NULL` | |
| `pdf_object_key` | `text` | Object-storage key for the rendered PDF; populated by `report.worker.ts`. |

---

## H. Knowledge Governance & Enrichment

### `candidate_enrichments` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE SET NULL | The audit that surfaced this candidate. |
| `target_entity_type` | `text NOT NULL` | Enum: vendor / vendor_field. |
| `target_vendor_id` | `uuid` FK → `vendors.id` ON DELETE SET NULL | NULL if this is a brand-new vendor proposal. |
| `proposed_changes_json` | `jsonb NOT NULL` | Field-level diffs OR a full new-vendor skeleton. |
| `source` | `text NOT NULL DEFAULT 'client_reported'` | Same enum as `provenance_records.source`. |
| `status` | `text NOT NULL DEFAULT 'pending'` | Enum: pending / accepted / rejected / merged. |
| `reviewed_by` | `uuid` FK → `users.id` | NULL until reviewed. |
| `reviewer_note` | `text` | |
| `created_at`, `reviewed_at` | `timestamptz` | |

### `learned_patterns` (NEW)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `segment_json` | `jsonb NOT NULL` | `{ property_type: 'independent', size_band: 'small', country: 'FR', goal: 'workload_reduction', stack_signal: 'no_guest_messaging' }`. |
| `observation` | `text NOT NULL` | E.g., "communication bottleneck reported in 70% of cases." |
| `observed_rate` | `numeric` | 0.0–1.0. |
| `supporting_project_count` | `int NOT NULL` | |
| `status` | `text NOT NULL` | Enum: surfaced / promoted_to_rule / dismissed. |
| `promoted_rule_id` | `text` | Reference to the rule code path once promoted. |
| `created_at`, `reviewed_at` | `timestamptz` | |

A materialized view `mv_audit_segment_outcomes` underlies pattern detection; it is refreshed nightly by `learning.worker.ts`.

---

## I. Implementation Tier Artifacts

### `knowledge_base_entries` (NEW)

Reusable, structured hotel content created during implementation.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `hotel_id` | `uuid` FK → `hotels.id` ON DELETE CASCADE | Tied to the persistent hotel, not the project (the knowledge base outlives a single audit). |
| `topic` | `text NOT NULL` | Enum: pre_arrival / access / breakfast / parking / late_check_in / billing / room_details / special_requests / other. |
| `title` | `text NOT NULL` | |
| `body` | `text NOT NULL` | Markdown. |
| `language` | `text NOT NULL` | |
| `last_edited_by` | `uuid` FK → `users.id` | |
| `version` | `int NOT NULL DEFAULT 1` | |

### `implementation_steps` (NEW)

Per FR-142.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `project_id` | `uuid` FK → `projects.id` ON DELETE CASCADE | |
| `roadmap_item_id` | `uuid` FK → `roadmap_items.id` ON DELETE SET NULL | |
| `kind` | `text NOT NULL` | Enum: knowledge_base / vendor_selected / tool_configured / automation_setup / website_content / ai_visibility / guest_messaging / training_delivered / performance_tracked. |
| `status` | `text NOT NULL` | Enum: todo / in_progress / done / blocked. |
| `done_at` | `timestamptz` | |
| `notes` | `text` | |

### `performance_metrics` (NEW)

Captured post-implementation per FR-142.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `hotel_id` | `uuid` FK → `hotels.id` ON DELETE CASCADE | |
| `metric` | `text NOT NULL` | Enum: response_time / repetitive_q_rate / direct_booking_rate / review_score / review_volume. |
| `value` | `numeric NOT NULL` | |
| `unit` | `text` | |
| `observed_at` | `timestamptz NOT NULL` | |
| `source` | `text NOT NULL` | Enum: hotelier_self_report / pms_integration / review_platform / manual. |

---

## J. Long-Term Integration Layer (V1: schema only)

### `integration_workflows` (NEW — schema only, runtime deferred)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `hotel_id` | `uuid` FK → `hotels.id` ON DELETE CASCADE | |
| `name` | `text NOT NULL` | |
| `definition_json` | `jsonb NOT NULL` | Workflow steps; runtime not built in V1 of this feature. |
| `status` | `text NOT NULL DEFAULT 'planned'` | Enum: planned / configured / active / paused / errored. |
| `compliance_posture_json` | `jsonb` | Per FR-152. |
| `created_at`, `updated_at` | `timestamptz` | |

---

## K. Identity, Users, and Roles

### `users` (EXTENDED from 001 `admins`)

The existing `admins` table is renamed `users` and extended:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Existing. |
| `email` | `text NOT NULL UNIQUE` | Existing. |
| `password_hash` | `text NOT NULL` | Existing. |
| `display_name` | `text` | NEW. |
| `created_at`, `last_login_at` | `timestamptz` | Existing. |

### `user_roles` (NEW)

Composable role grants per Clarification Q4. A user holds zero or more roles; the effective capability is the union.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` FK → `users.id` ON DELETE CASCADE | Part of PK. |
| `role` | `text NOT NULL` | Enum: consultant / questionnaire_admin / vendor_database_admin / super_admin. Part of PK. |
| `granted_by` | `uuid` FK → `users.id` ON DELETE SET NULL | |
| `granted_at` | `timestamptz NOT NULL` | |

**Primary key**: `(user_id, role)`. Each grant is individually revocable.

### `internal_notes` (EXTENDED from 001)

Existing per-project consultant note table; extended to allow per-recommendation notes:

| Column added | Type | Notes |
|---|---|---|
| `target_type` | `text NOT NULL DEFAULT 'project'` | Enum: project / recommendation / vendor / question. |
| `target_id` | `uuid NOT NULL` | Polymorphic FK (no DB-level constraint; application enforces). |

### `audit_log` (EXTENDED from 001)

Action set is extended to cover the new operations (FR-164):

```
project_created, project_link_revoked, project_reopened, project_purged,
report_published, report_exported,
scan_started, scan_completed, scan_failed,
vendor_created, vendor_updated, vendor_retired,
question_created, question_published, question_deactivated,
candidate_enrichment_created, candidate_enrichment_accepted, candidate_enrichment_rejected,
learned_pattern_surfaced, learned_pattern_promoted, learned_pattern_dismissed,
consultant_override_applied,
deletion_requested, deletion_executed,
role_granted, role_revoked,
user_login, user_logout.
```

The `audit_log` row carries `actor_id`, `action`, `target_type`, `target_id`, `metadata_json`, `created_at`. **Audit-log entries are retained for compliance demonstration even when a hotel exercises deletion** (the carve-out documented in FR-166): the entry remains but identifying fields in `metadata_json` are scrubbed.

---

## L. State Transitions

### `projects.status` state machine

```
draft
  └─→ awaiting_client       (admin sends link)
        └─→ in_progress      (client opens form)
              └─→ submitted   (client submits)
                    ├─→ consultant_finalized  (consultant publishes consultant-tier deliverable)
                    │     └─→ published        (deliverable shared to client)
                    └─→ published              (auto-publish for self-service tiers)
                          └─→ archived          (manual archive, or automatic for free_scan at 90d → purge)

Any non-published state may transition to:
  reopened                    (admin reopens)
  purged                      (hotelier-deletion or 90d sweep for free_scan)
```

### `scans.status` state machine

```
queued → running → succeeded
                 → failed
                 → blocked   (captcha, login wall, geo-block)
```

### `candidate_enrichments.status` state machine

```
pending → accepted   (changes merged into vendor entry; new vendor_version row created)
        → rejected   (preserved for traceability; never reaches recommendations)
        → merged     (reserved for partial accepts that combine multiple candidates)
```

---

## M. Relationships at a glance

```
hotels 1───* projects 1───* submissions 1───* answers *───1 question_versions
                  │                                          │
                  │                                          │
                  ├───* scans 1───* scan_findings            │
                  │                                          │
                  ├───* scenarios 1───* recommendations *───* vendors
                  │                                          │
                  ├───* readiness_scores                     ├───* vendor_versions
                  ├───* roadmap_items *───1 recommendations  ├───* vendor_translations
                  ├───* compliance_findings                  └───* provenance_records (polymorphic)
                  ├───1 funding_briefs
                  ├───* report_snapshots
                  ├───* candidate_enrichments
                  └───* implementation_steps

hotels 1───* knowledge_base_entries
hotels 1───* performance_metrics
hotels 1───* integration_workflows

users *───* user_roles
```

---

## N. Indexes & Performance Notes

- `scans.canonical_url` btree — drives the freshness-window cache lookup (FR-006).
- `scan_findings.value_json` GIN — ad-hoc analytics and fingerprint queries.
- `answers (submission_id, question_version_id)` composite — drives the renderer.
- `vendors (category, status)` btree + `vendors.tags` GIN — drives the admin filter and the recommendation engine's eligibility pre-filter.
- `provenance_records (entity_type, entity_id, field_path)` btree — drives the source-attribution lookup on render.
- `recommendations (project_id, scenario_id, do_not_do_now)` btree — drives the report renderer.
- `report_snapshots (project_id, published_at DESC)` btree — finds the latest published version.
- Materialized view `mv_audit_segment_outcomes` refreshed nightly — underlies the learning loop.

---

## O. Migration Notes

- `audit/scripts/migrate-mysql-to-postgres.ts` performs the cutover (R5).
- The existing `audit/db/schema.ts` is rewritten to declare all the new tables; existing tables (`admins → users`, `projects`, `submissions`, `answers`, `scores → readiness_scores`, `internal_notes`, `audit_log`, `meta`) are remapped per this document.
- Existing data is preserved: every existing project gets a `tier = 'full'`, every existing answer gets a synthetic `question_version_id` pointing at a "v1-imported" question row whose slug matches the legacy `field_id`.
