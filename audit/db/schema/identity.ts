/**
 * Identity + project schema (data-model.md §A + §K).
 * Postgres 16 via Drizzle. Feature 003 — Hotel Diagnostic Platform.
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  smallint,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

/* ------------------------------ Enum value lists ------------------------------ */

export const PROJECT_TIERS = [
  "free_scan",
  "mini",
  "full",
  "consultant_assisted",
  "implementation",
] as const;
export type ProjectTier = (typeof PROJECT_TIERS)[number];

export const PROJECT_STATUSES = [
  "draft",
  "awaiting_client",
  "in_progress",
  "submitted",
  "consultant_finalized",
  "published",
  "archived",
  "reopened",
  "purged",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROPERTY_TYPES = [
  "independent",
  "boutique",
  "family",
  "aparthotel",
  "guesthouse",
  "small_group",
] as const;

export const PRIMARY_GOALS = [
  "profitability",
  "workload_reduction",
  "direct_bookings",
  "guest_satisfaction",
  "ai_readiness",
  "pms_evaluation",
  "reviews",
  "processes",
  "ota_dependency",
  "modernize",
  "other",
] as const;

export const BUDGET_LEVELS = [
  "none",
  "low",
  "moderate",
  "high",
  "open_if_roi_clear",
  "unsure",
] as const;

export const USER_ROLES = [
  "consultant",
  "questionnaire_admin",
  "vendor_database_admin",
  "super_admin",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Audit-log actions — extended per data-model.md §K. Stored as text so adding
// a new action does not require a database migration.
export const AUDIT_ACTIONS = [
  "project_created",
  "project_link_revoked",
  "project_reopened",
  "project_purged",
  "report_published",
  "report_exported",
  "scan_started",
  "scan_completed",
  "scan_failed",
  "scan_email_opt_in",
  "vendor_created",
  "vendor_updated",
  "vendor_retired",
  "question_created",
  "question_published",
  "question_deactivated",
  "candidate_enrichment_created",
  "candidate_enrichment_accepted",
  "candidate_enrichment_rejected",
  "learned_pattern_surfaced",
  "learned_pattern_promoted",
  "learned_pattern_dismissed",
  "consultant_override_applied",
  "deletion_requested",
  "deletion_executed",
  "role_granted",
  "role_revoked",
  "user_login",
  "user_logout",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/* ------------------------------ users (renamed from admins) ------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});
export type User = typeof users.$inferSelect;

/* ------------------------------ user_roles (composable) ------------------------------ */

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<UserRole>().notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })],
);

/* ------------------------------ hotels ------------------------------ */

export const hotels = pgTable(
  "hotels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalUrl: text("canonical_url").notNull(),
    displayName: text("display_name"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    propertyType: text("property_type"),
    starRating: smallint("star_rating"),
    roomCount: integer("room_count"),
    primaryLanguage: text("primary_language").notNull().default("fr"),
    latestProjectId: uuid("latest_project_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("hotels_canonical_url_unique").on(t.canonicalUrl),
    index("hotels_country_region_idx").on(t.country, t.region),
  ],
);
export type Hotel = typeof hotels.$inferSelect;

/* ------------------------------ projects ------------------------------ */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    hotelName: text("hotel_name"),
    contactEmail: text("contact_email"),
    priority: text("priority").$type<Priority>().notNull().default("medium"),
    status: text("status").$type<ProjectStatus>().notNull().default("draft"),
    tokenHash: text("token_hash"),
    tokenRevokedAt: timestamp("token_revoked_at", { withTimezone: true }),
    ongoingEngagement: boolean("ongoing_engagement").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastAdminActivityAt: timestamp("last_admin_activity_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),

    // Feature 003 additions
    hotelId: uuid("hotel_id").references(() => hotels.id, { onDelete: "restrict" }),
    tier: text("tier").$type<ProjectTier>().notNull().default("full"),
    goalPrimary: text("goal_primary"),
    goalSecondary: text("goal_secondary").array(),
    budgetLevel: text("budget_level"),
    purgeAfter: timestamp("purge_after", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("projects_token_hash_unique").on(t.tokenHash),
    index("projects_status_activity_idx").on(t.status, t.lastAdminActivityAt),
    index("projects_tier_purge_idx").on(t.tier, t.purgeAfter),
  ],
);
export type Project = typeof projects.$inferSelect;

/* ------------------------------ submissions (1:1 with projects) ------------------------------ */

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  completionPct: integer("completion_pct").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ internal notes (extended) ------------------------------ */

export const INTERNAL_NOTE_TARGETS = [
  "project",
  "recommendation",
  "vendor",
  "question",
] as const;

export const internalNotes = pgTable(
  "internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    targetType: text("target_type").notNull().default("project"),
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("internal_notes_project_created_idx").on(t.projectId, t.createdAt)],
);

/* ------------------------------ audit log ------------------------------ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").$type<AuditAction>().notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    metadataJson: text("metadata_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_project_created_idx").on(t.projectId, t.createdAt),
    index("audit_log_action_created_idx").on(t.action, t.createdAt),
  ],
);

/* ------------------------------ meta (single-row config) ------------------------------ */

export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
