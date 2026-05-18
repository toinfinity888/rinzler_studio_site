/**
 * Shared types for the dynamic questionnaire runtime.
 *
 * The "renderable question" shape is the contract between
 * `getNextQuestionBlock` (server action) and the client-side block renderer.
 * It is derived from the DB rows (questions + current question_version +
 * translation), never authored by hand.
 */

import type { AnswerType, QuestionBlock } from "@/db/schema";

/** One option in a single/multi/dropdown/ranking question. */
export interface QuestionOption {
  slug: string;
  label: string;
}

/** Numeric range for slider questions. */
export interface SliderRange {
  min: number;
  max: number;
  step?: number;
  unit?: string | null;
}

/**
 * The "definition_json" stored on `question_versions.definition_json`.
 * The shape varies by answer_type; we keep it permissive on the wire and
 * narrow it in the schema builder.
 */
export interface QuestionDefinition {
  /** Common to every type: render-time required flag. "I don't know" still passes. */
  required?: boolean;
  /** Helper text. Falls back to translation.helper. */
  helper?: string;
  /** For single/multi/dropdown/ranking: ordered option slugs. */
  options?: string[];
  /** For slider. */
  range?: SliderRange;
  /** For multi/ranking: max items selectable. NULL = unlimited. */
  maxItems?: number;
  /** For ranking: number of items the hotelier MUST rank (top-N). */
  topN?: number;
  /** For short_text: max length. */
  maxLength?: number;
  /** For voice: max recording duration in seconds. */
  maxDurationSeconds?: number;
}

/**
 * A question hydrated for the renderer. Equivalent to one row in
 * `next_block.questions`. The `option_labels` map (slug → label) is taken
 * from the active translation; `fallback_language_used` is set when the
 * primary translation was missing and we fell through to canonical FR.
 */
export interface RenderableQuestion {
  question_id: string;
  question_version_id: string;
  slug: string;
  block: QuestionBlock;
  answer_type: AnswerType;
  prompt: string;
  helper: string | null;
  definition: QuestionDefinition;
  options: QuestionOption[];
  language_used: string;
  fallback_language_used: boolean;
}

/** A block returned by `getNextQuestionBlock`. */
export interface QuestionBlockPayload {
  block_id: QuestionBlock;
  block_title: string;
  block_progress: { index: number; total: number };
  questions: RenderableQuestion[];
  /**
   * The runtime Zod schema serialized as JSON. The client SHOULD use this
   * for instant client-side validation, but the server ALWAYS re-validates
   * on `commitAnswer`. Constitution v1.2.0: the renderer and the validator
   * read the same rows so they cannot drift.
   */
  zod_schema_json: SerializedSchema;
  prefilled: { question_slug: string; source: "scan" | "consultant" }[];
  language_fallback_used: { question_id: string }[];
}

/**
 * Serialized form of the runtime Zod schema. The client re-hydrates via
 * `lib/questionnaire/schema-builder.ts#buildZodFromSerialized`.
 */
export interface SerializedSchema {
  type: "object";
  shape: Record<string, SerializedField>;
}

export type SerializedField =
  | { kind: "single"; options: string[]; required: boolean }
  | { kind: "multi"; options: string[]; required: boolean; maxItems?: number }
  | { kind: "dropdown"; options: string[]; required: boolean }
  | {
      kind: "slider";
      min: number;
      max: number;
      step: number;
      required: boolean;
    }
  | {
      kind: "ranking";
      options: string[];
      required: boolean;
      topN?: number;
    }
  | { kind: "yes_no_unknown"; required: boolean }
  | { kind: "short_text"; required: boolean; maxLength?: number }
  | { kind: "voice"; required: boolean; maxDurationSeconds?: number };
