import {
  mysqlTable,
  varchar,
  int,
  text,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

/* ------------------------------------------------------------------ *
 *  Shared enum value lists (also exported for runtime validation)    *
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

export const ANSWER_SOURCES = ["client", "admin_prefill"] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];

export const SCORE_NAMES = [
  "automation_opportunity",
  "operational_complexity",
  "modernization_readiness",
  "digital_maturity",
] as const;
export type ScoreName = (typeof SCORE_NAMES)[number];

export const SCORE_BANDS = ["low", "medium", "high"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

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

/* ------------------------------------------------------------------ *
 *  Admins (V1: exactly one row, table sized for future N admins)     *
 * ------------------------------------------------------------------ */

export const admins = mysqlTable("admins", {
  // UUIDv7 stored as a 36-char string — same shape as the SQLite version.
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  // Argon2id hashes are ~96 chars; 255 leaves headroom for future bumps.
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

/* ------------------------------------------------------------------ *
 *  Projects                                                           *
 * ------------------------------------------------------------------ */

export const projects = mysqlTable(
  "projects",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    label: varchar("label", { length: 200 }).notNull(),
    hotelName: varchar("hotel_name", { length: 200 }),
    contactEmail: varchar("contact_email", { length: 200 }).notNull(),
    priority: mysqlEnum("priority", PRIORITIES).notNull().default("medium"),
    status: mysqlEnum("status", PROJECT_STATUSES).notNull().default("draft"),
    // SHA-256 hex digest = 64 chars exactly.
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    tokenRevokedAt: timestamp("token_revoked_at"),
    ongoingEngagement: boolean("ongoing_engagement").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    sentAt: timestamp("sent_at"),
    lastAdminActivityAt: timestamp("last_admin_activity_at").notNull().defaultNow(),
    submittedAt: timestamp("submitted_at"),
    lastEditedAt: timestamp("last_edited_at"),
    createdBy: varchar("created_by", { length: 36 })
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

export const submissions = mysqlTable("submissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  completionPct: int("completion_pct").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ON UPDATE CURRENT_TIMESTAMP is set by the migration; Drizzle just declares the default.
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ *
 *  Answers (one row per submitted field, upserted by autosave)       *
 * ------------------------------------------------------------------ */

export const answers = mysqlTable(
  "answers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    submissionId: varchar("submission_id", { length: 36 })
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    // field_id is at most ~40 chars in practice (e.g. `s2.channel_manager.frustrations`).
    fieldId: varchar("field_id", { length: 80 }).notNull(),
    // text = up to 64 KB; sufficient for every textarea + system-block sub-field.
    valueJson: text("value_json").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    source: mysqlEnum("source", ANSWER_SOURCES).notNull().default("client"),
  },
  (t) => [uniqueIndex("answers_submission_field_unique").on(t.submissionId, t.fieldId)],
);

/* ------------------------------------------------------------------ *
 *  Scores (one row per (submission, score-name))                     *
 * ------------------------------------------------------------------ */

export const scores = mysqlTable(
  "scores",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    submissionId: varchar("submission_id", { length: 36 })
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    name: mysqlEnum("name", SCORE_NAMES).notNull(),
    value: int("value").notNull(),
    band: mysqlEnum("band", SCORE_BANDS).notNull(),
    basisJson: text("basis_json").notNull(),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("scores_submission_name_unique").on(t.submissionId, t.name)],
);

/* ------------------------------------------------------------------ *
 *  Internal notes (append-only thread per project)                   *
 * ------------------------------------------------------------------ */

export const internalNotes = mysqlTable(
  "internal_notes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    projectId: varchar("project_id", { length: 36 })
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: varchar("author_id", { length: 36 })
      .notNull()
      .references(() => admins.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("internal_notes_project_created_idx").on(t.projectId, t.createdAt)],
);

/* ------------------------------------------------------------------ *
 *  Audit log (operational record; retained indefinitely)             *
 * ------------------------------------------------------------------ */

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorId: varchar("actor_id", { length: 36 }).references(() => admins.id),
    action: mysqlEnum("action", AUDIT_ACTIONS).notNull(),
    projectId: varchar("project_id", { length: 36 }).references(() => projects.id, {
      onDelete: "set null",
    }),
    metadataJson: text("metadata_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_project_created_idx").on(t.projectId, t.createdAt),
    index("audit_log_action_created_idx").on(t.action, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ *
 *  Meta (single-row config / runtime markers)                        *
 * ------------------------------------------------------------------ */

export const meta = mysqlTable("meta", {
  // Short key (e.g. "last_purge_sweep_at"); 64 chars is plenty.
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
