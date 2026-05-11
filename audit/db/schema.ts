import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/* ------------------------------------------------------------------ *
 *  Admins (V1: exactly one row, table sized for future N admins)     *
 * ------------------------------------------------------------------ */

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
});

/* ------------------------------------------------------------------ *
 *  Projects                                                           *
 * ------------------------------------------------------------------ */

export const PROJECT_STATUSES = [
  "draft",
  "awaiting",
  "in_progress",
  "submitted",
  "reopened",
  "purged",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    hotelName: text("hotel_name"),
    contactEmail: text("contact_email").notNull(),
    priority: text("priority", { enum: PRIORITIES }).notNull().default("medium"),
    status: text("status", { enum: PROJECT_STATUSES }).notNull().default("draft"),
    tokenHash: text("token_hash").notNull(),
    tokenRevokedAt: integer("token_revoked_at", { mode: "timestamp" }),
    ongoingEngagement: integer("ongoing_engagement", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    sentAt: integer("sent_at", { mode: "timestamp" }),
    lastAdminActivityAt: integer("last_admin_activity_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    submittedAt: integer("submitted_at", { mode: "timestamp" }),
    lastEditedAt: integer("last_edited_at", { mode: "timestamp" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => admins.id),
  },
  (t) => [
    uniqueIndex("projects_token_hash_unique").on(t.tokenHash),
    index("projects_status_activity_idx").on(t.status, t.lastAdminActivityAt),
  ],
);

/* ------------------------------------------------------------------ *
 *  Submissions (1:1 with projects, modeled separately)               *
 * ------------------------------------------------------------------ */

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  completionPct: integer("completion_pct").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/* ------------------------------------------------------------------ *
 *  Answers (one row per submitted field, upserted by autosave)       *
 * ------------------------------------------------------------------ */

export const ANSWER_SOURCES = ["client", "admin_prefill"] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];

export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    fieldId: text("field_id").notNull(),
    valueJson: text("value_json").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    source: text("source", { enum: ANSWER_SOURCES }).notNull().default("client"),
  },
  (t) => [uniqueIndex("answers_submission_field_unique").on(t.submissionId, t.fieldId)],
);

/* ------------------------------------------------------------------ *
 *  Scores (one row per (submission, score-name))                     *
 * ------------------------------------------------------------------ */

export const SCORE_NAMES = [
  "automation_opportunity",
  "operational_complexity",
  "modernization_readiness",
  "digital_maturity",
] as const;
export type ScoreName = (typeof SCORE_NAMES)[number];

export const SCORE_BANDS = ["low", "medium", "high"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const scores = sqliteTable(
  "scores",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    name: text("name", { enum: SCORE_NAMES }).notNull(),
    value: integer("value").notNull(),
    band: text("band", { enum: SCORE_BANDS }).notNull(),
    basisJson: text("basis_json").notNull(),
    computedAt: integer("computed_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("scores_submission_name_unique").on(t.submissionId, t.name)],
);

/* ------------------------------------------------------------------ *
 *  Internal notes (append-only thread per project)                   *
 * ------------------------------------------------------------------ */

export const internalNotes = sqliteTable(
  "internal_notes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => admins.id),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("internal_notes_project_created_idx").on(t.projectId, t.createdAt)],
);

/* ------------------------------------------------------------------ *
 *  Audit log (operational record; retained indefinitely)             *
 * ------------------------------------------------------------------ */

export const AUDIT_ACTIONS = [
  "project.create",
  "project.delete",
  "project.revoke",
  "project.reopen",
  "project.mark_ongoing",
  "project.update_priority",
  "project.export_json",
  "project.purge",
  "admin.login",
  "admin.login_failed",
  "admin.logout",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => admins.id),
    action: text("action", { enum: AUDIT_ACTIONS }).notNull(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    metadataJson: text("metadata_json"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("audit_log_project_created_idx").on(t.projectId, t.createdAt),
    index("audit_log_action_created_idx").on(t.action, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ *
 *  Meta (single-row config / runtime markers)                        *
 * ------------------------------------------------------------------ */

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
