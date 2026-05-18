/**
 * Report snapshot schema (data-model.md §G).
 * Snapshots are immutable per FR-094 / SC-020.
 */
import { pgTable, text, uuid, timestamp, jsonb, index } from "drizzle-orm/pg-core";

import { projects, users } from "./identity";

export const reportSnapshots = pgTable(
  "report_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
    tierAtPublication: text("tier_at_publication").notNull(),
    goalPrimaryAtPublication: text("goal_primary_at_publication"),
    renderedJson: jsonb("rendered_json").notNull(),
    referencedVendorVersions: uuid("referenced_vendor_versions").array(),
    referencedQuestionVersions: uuid("referenced_question_versions").array(),
    ruleEngineVersion: text("rule_engine_version").notNull(),
    pdfObjectKey: text("pdf_object_key"),
  },
  (t) => [index("report_snapshots_project_published_idx").on(t.projectId, t.publishedAt)],
);
