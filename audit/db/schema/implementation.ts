/**
 * Implementation tier + integration-layer schema (data-model.md §I + §J).
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

import { hotels, projects, users } from "./identity";
import { roadmapItems } from "./recommendation";

export const KB_TOPICS = [
  "pre_arrival",
  "access",
  "breakfast",
  "parking",
  "late_check_in",
  "billing",
  "room_details",
  "special_requests",
  "other",
] as const;

export const knowledgeBaseEntries = pgTable("knowledge_base_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotelId: uuid("hotel_id")
    .notNull()
    .references(() => hotels.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  language: text("language").notNull(),
  lastEditedBy: uuid("last_edited_by").references(() => users.id, {
    onDelete: "set null",
  }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const IMPLEMENTATION_STEP_KINDS = [
  "knowledge_base",
  "vendor_selected",
  "tool_configured",
  "automation_setup",
  "website_content",
  "ai_visibility",
  "guest_messaging",
  "training_delivered",
  "performance_tracked",
] as const;

export const implementationSteps = pgTable("implementation_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  roadmapItemId: uuid("roadmap_item_id").references(() => roadmapItems.id, {
    onDelete: "set null",
  }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("todo"),
  doneAt: timestamp("done_at", { withTimezone: true }),
  notes: text("notes"),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotelId: uuid("hotel_id")
    .notNull()
    .references(() => hotels.id, { onDelete: "cascade" }),
  metric: text("metric").notNull(),
  value: numeric("value").notNull(),
  unit: text("unit"),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  source: text("source").notNull(),
});

export const integrationWorkflows = pgTable("integration_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  hotelId: uuid("hotel_id")
    .notNull()
    .references(() => hotels.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  definitionJson: jsonb("definition_json").notNull(),
  status: text("status").notNull().default("planned"),
  compliancePostureJson: jsonb("compliance_posture_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
