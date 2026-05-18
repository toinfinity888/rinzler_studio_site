/**
 * Knowledge / learning schema (data-model.md §H).
 *
 * Note: the `mv_audit_segment_outcomes` materialized view is NOT defined in
 * Drizzle (Drizzle has no first-class MV DSL). It is created/refreshed via a
 * raw-SQL migration in `db/migrations/` (T138). The Drizzle schema only
 * tracks the tables that back the review queue and the learned-pattern rows.
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

import { projects, users } from "./identity";
import { vendors } from "./vendor";

export const CANDIDATE_ENRICHMENT_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "merged",
] as const;
export type CandidateEnrichmentStatus = (typeof CANDIDATE_ENRICHMENT_STATUSES)[number];

export const candidateEnrichments = pgTable("candidate_enrichments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  targetEntityType: text("target_entity_type").notNull(),
  targetVendorId: uuid("target_vendor_id").references(() => vendors.id, {
    onDelete: "set null",
  }),
  proposedChangesJson: jsonb("proposed_changes_json").notNull(),
  source: text("source").notNull().default("client_reported"),
  status: text("status")
    .$type<CandidateEnrichmentStatus>()
    .notNull()
    .default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewerNote: text("reviewer_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const LEARNED_PATTERN_STATUSES = [
  "surfaced",
  "promoted_to_rule",
  "dismissed",
] as const;

export const learnedPatterns = pgTable("learned_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  segmentJson: jsonb("segment_json").notNull(),
  observation: text("observation").notNull(),
  observedRate: numeric("observed_rate"),
  supportingProjectCount: integer("supporting_project_count").notNull(),
  status: text("status").notNull().default("surfaced"),
  promotedRuleId: text("promoted_rule_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});
