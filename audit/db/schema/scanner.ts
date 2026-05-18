/**
 * Scanner schema (data-model.md §B).
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { projects } from "./identity";

export const SCAN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "blocked",
] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

export const SCAN_ERROR_CLASSES = [
  "unreachable",
  "captcha_blocked",
  "login_wall",
  "non_hotel",
  "scanner_error",
] as const;
export type ScanErrorClass = (typeof SCAN_ERROR_CLASSES)[number];

export const FINDING_CONFIDENCES = ["high", "medium", "low"] as const;
export type FindingConfidence = (typeof FINDING_CONFIDENCES)[number];

export const scans = pgTable(
  "scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    status: text("status").$type<ScanStatus>().notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorClass: text("error_class").$type<ScanErrorClass>(),
    fingerprintSummary: jsonb("fingerprint_summary"),
    freshnessExpiresAt: timestamp("freshness_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scans_canonical_url_idx").on(t.canonicalUrl),
    index("scans_status_idx").on(t.status),
  ],
);
export type Scan = typeof scans.$inferSelect;

export const scanFindings = pgTable(
  "scan_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id")
      .notNull()
      .references(() => scans.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    valueJson: jsonb("value_json").notNull(),
    evidence: jsonb("evidence"),
    confidence: text("confidence").$type<FindingConfidence>().notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scan_findings_scan_field_idx").on(t.scanId, t.field)],
);
export type ScanFinding = typeof scanFindings.$inferSelect;
