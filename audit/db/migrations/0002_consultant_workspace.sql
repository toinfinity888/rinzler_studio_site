-- T087/T088 — Consultant workspace (US 4).
--
-- (1) Relax the unique constraint on `answers (submission_id, field_id)` so a
--     `consultant_override` row can coexist with the original client answer
--     (FR-072, FR-073). The original client row keeps the slot; overrides are
--     written as additional rows whose `source = 'consultant_override'` and
--     `overrides_answer_id` points at the client row that is being overridden.
--     Latest-wins semantics live in the engine context-builder.
--
-- (2) Add `scenario_weight_overrides` — per-(project,scenario,recommendation)
--     consultant tweaks consumed at the next snapshot rebuild.
DROP INDEX IF EXISTS "answers_submission_field_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "answers_submission_field_unique" ON "answers" USING btree ("submission_id","field_id") WHERE source <> 'consultant_override';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenario_weight_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "scenario_id" uuid REFERENCES "scenarios"("id") ON DELETE CASCADE,
  "recommendation_id" uuid REFERENCES "recommendations"("id") ON DELETE CASCADE,
  "adjustment" text NOT NULL,
  "weight_delta" smallint,
  "reason" text,
  "author_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenario_weight_overrides_project_idx" ON "scenario_weight_overrides" ("project_id","scenario_id");
