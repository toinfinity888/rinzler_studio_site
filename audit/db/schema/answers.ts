/**
 * Answers + voice schema (data-model.md §D).
 * NO RAW AUDIO IS PERSISTED — only the post-edit transcript and the structured
 * extraction. See voice_captures column comments and FR-013.
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  uniqueIndex,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  index,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

import { submissions } from "./identity";
import { questionVersions } from "./questionnaire";

export const ANSWER_SOURCES = [
  "client",
  "admin_prefill",
  "consultant_override",
  "voice_extracted",
  "scan_inferred",
] as const;
export type AnswerSource = (typeof ANSWER_SOURCES)[number];

export const ANSWER_CONFIDENCES = ["high", "medium", "low"] as const;
export type AnswerConfidence = (typeof ANSWER_CONFIDENCES)[number];

export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    fieldId: text("field_id").notNull(),
    valueJson: jsonb("value_json").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    source: text("source").$type<AnswerSource>().notNull().default("client"),
    questionVersionId: uuid("question_version_id").references(
      () => questionVersions.id,
      { onDelete: "restrict" },
    ),
    confidence: text("confidence").$type<AnswerConfidence>().notNull().default("high"),
    // Self-referential FK — points at the original client answer when this
    // row is a consultant override (FR-072 / FR-073). The `AnyPgColumn` cast
    // is the Drizzle idiom for self-references.
    overridesAnswerId: uuid("overrides_answer_id").references(
      (): AnyPgColumn => answers.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [uniqueIndex("answers_submission_field_unique").on(t.submissionId, t.fieldId)],
);
export type Answer = typeof answers.$inferSelect;

export const voiceCaptures = pgTable("voice_captures", {
  id: uuid("id").primaryKey().defaultRandom(),
  answerId: uuid("answer_id")
    .notNull()
    .references(() => answers.id, { onDelete: "cascade" }),
  // The hotelier-reviewed transcript. NO RAW AUDIO IS PERSISTED (FR-013).
  transcriptPostEdit: text("transcript_post_edit").notNull(),
  structuredExtraction: jsonb("structured_extraction"),
  redactionCategoriesMatched: text("redaction_categories_matched").array(),
  transcriptionProvider: text("transcription_provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
