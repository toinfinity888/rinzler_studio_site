/**
 * Questionnaire schema (data-model.md §C).
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export const QUESTION_BLOCKS = [
  "profile",
  "goal",
  "stack",
  "website",
  "communication",
  "operations",
  "knowledge_ai",
  "reviews",
  "ai_visibility",
  "compliance",
  "budget",
  "pms_deep",
  "goal_branch",
  "prioritization",
] as const;
export type QuestionBlock = (typeof QUESTION_BLOCKS)[number];

export const ANSWER_TYPES = [
  "single",
  "multi",
  "dropdown",
  "slider",
  "ranking",
  "yes_no_unknown",
  "short_text",
  "voice",
] as const;
export type AnswerType = (typeof ANSWER_TYPES)[number];

export const QUESTION_STATUSES = ["draft", "published", "deactivated"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  block: text("block").$type<QuestionBlock>().notNull(),
  answerType: text("answer_type").$type<AnswerType>().notNull(),
  auditLevels: text("audit_levels").array().notNull(),
  hotelTypes: text("hotel_types").array(),
  goalRelevance: text("goal_relevance").array(),
  scoringContributions: jsonb("scoring_contributions"),
  currentVersion: integer("current_version").notNull().default(1),
  status: text("status").$type<QuestionStatus>().notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Question = typeof questions.$inferSelect;

export const questionVersions = pgTable(
  "question_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    definitionJson: jsonb("definition_json").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [uniqueIndex("question_versions_qid_version_unique").on(t.questionId, t.version)],
);
export type QuestionVersion = typeof questionVersions.$inferSelect;

export const questionTranslations = pgTable(
  "question_translations",
  {
    questionVersionId: uuid("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    prompt: text("prompt").notNull(),
    helper: text("helper"),
    optionLabels: jsonb("option_labels"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.questionVersionId, t.language] })],
);

export const questionConditions = pgTable("question_conditions", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionVersionId: uuid("question_version_id")
    .notNull()
    .references(() => questionVersions.id, { onDelete: "cascade" }),
  expressionJson: jsonb("expression_json").notNull(),
});
