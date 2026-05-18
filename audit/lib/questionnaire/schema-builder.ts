/**
 * T051 — Runtime Zod schema builder.
 *
 * Constitution v1.2.0: the questionnaire schema MAY live in the DB, but the
 * runtime validator MUST be derived from the same rows the renderer
 * consumes — preserving single-source-of-truth (questions →
 * question_versions → question_translations → question_conditions).
 *
 * This module exposes two entry points:
 *
 *  1. `buildBlockSchema(questions)` — server-side. Walks an array of hydrated
 *     `RenderableQuestion`s and returns a Zod object schema that validates
 *     the `commitAnswer` payload (one slug → value pair at a time). It also
 *     emits a JSON-serializable `SerializedSchema` for the client renderer.
 *
 *  2. `buildSerializedSchema(questions)` — same walk, but only emits the
 *     wire-shape (no Zod instance). Useful when we just need to hand the
 *     client side the schema description.
 *
 * The server uses the Zod instance directly on `commitAnswer`; the client
 * may rehydrate the serialized schema via `hydrateSerializedSchema()`.
 */
import { z, type ZodTypeAny } from "zod";

import type {
  RenderableQuestion,
  SerializedField,
  SerializedSchema,
} from "./types";

/* ------------------------------------------------------------------ */
/* Per-type Zod builders                                              */
/* ------------------------------------------------------------------ */

function buildFieldZod(field: SerializedField): ZodTypeAny {
  switch (field.kind) {
    case "single":
    case "dropdown": {
      const enum_ = z.enum(field.options as [string, ...string[]]);
      return field.required ? enum_ : enum_.optional();
    }
    case "multi": {
      const arr = z.array(z.enum(field.options as [string, ...string[]]));
      const sized = field.maxItems ? arr.max(field.maxItems) : arr;
      return field.required ? sized.min(1) : sized;
    }
    case "slider": {
      const num = z.number().min(field.min).max(field.max);
      return field.required ? num : num.optional();
    }
    case "ranking": {
      const arr = z.array(z.enum(field.options as [string, ...string[]]));
      const topN = field.topN ?? field.options.length;
      const sized = arr.max(topN);
      return field.required ? sized.min(Math.min(topN, field.options.length)) : sized;
    }
    case "yes_no_unknown": {
      const enum_ = z.enum(["yes", "no", "unknown"]);
      return field.required ? enum_ : enum_.optional();
    }
    case "short_text": {
      let s = z.string().trim();
      if (field.maxLength) s = s.max(field.maxLength);
      return field.required ? s.min(1) : s.optional();
    }
    case "voice": {
      // The "value" written into answers.value_json for a voice answer is
      // the transcript_post_edit string. The full voice_capture payload is
      // validated separately on the commit path.
      const s = z.string().trim();
      return field.required ? s.min(1) : s.optional();
    }
    default: {
      // Exhaustive guard
      const _exhaustive: never = field;
      throw new Error(`Unknown field kind: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Serialization                                                       */
/* ------------------------------------------------------------------ */

function questionToSerializedField(q: RenderableQuestion): SerializedField {
  const required = q.definition.required ?? false;
  const optionSlugs = q.options.map((o) => o.slug);
  switch (q.answer_type) {
    case "single":
      return { kind: "single", options: optionSlugs, required };
    case "multi":
      return {
        kind: "multi",
        options: optionSlugs,
        required,
        ...(q.definition.maxItems ? { maxItems: q.definition.maxItems } : {}),
      };
    case "dropdown":
      return { kind: "dropdown", options: optionSlugs, required };
    case "slider": {
      const r = q.definition.range ?? { min: 0, max: 100, step: 1 };
      return {
        kind: "slider",
        min: r.min,
        max: r.max,
        step: r.step ?? 1,
        required,
      };
    }
    case "ranking":
      return {
        kind: "ranking",
        options: optionSlugs,
        required,
        ...(q.definition.topN ? { topN: q.definition.topN } : {}),
      };
    case "yes_no_unknown":
      return { kind: "yes_no_unknown", required };
    case "short_text":
      return {
        kind: "short_text",
        required,
        ...(q.definition.maxLength ? { maxLength: q.definition.maxLength } : {}),
      };
    case "voice":
      return {
        kind: "voice",
        required,
        ...(q.definition.maxDurationSeconds
          ? { maxDurationSeconds: q.definition.maxDurationSeconds }
          : {}),
      };
    default: {
      const _exhaustive: never = q.answer_type;
      throw new Error(`Unsupported answer_type: ${String(_exhaustive)}`);
    }
  }
}

export function buildSerializedSchema(
  questions: RenderableQuestion[],
): SerializedSchema {
  const shape: Record<string, SerializedField> = {};
  for (const q of questions) {
    shape[q.slug] = questionToSerializedField(q);
  }
  return { type: "object", shape };
}

/* ------------------------------------------------------------------ */
/* Hydration                                                          */
/* ------------------------------------------------------------------ */

/** Rehydrate a serialized schema into a Zod object schema. */
export function hydrateSerializedSchema(
  serialized: SerializedSchema,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const [slug, field] of Object.entries(serialized.shape)) {
    shape[slug] = buildFieldZod(field);
  }
  return z.object(shape);
}

/**
 * Build both: the JSON-serializable schema (for the wire) AND the live Zod
 * schema (for server-side validation). They are produced from the same
 * walk to guarantee they cannot drift.
 */
export function buildBlockSchema(questions: RenderableQuestion[]): {
  serialized: SerializedSchema;
  zod: z.ZodObject<Record<string, ZodTypeAny>>;
} {
  const serialized = buildSerializedSchema(questions);
  const zod = hydrateSerializedSchema(serialized);
  return { serialized, zod };
}

/**
 * Validate a single-question commit payload against a serialized schema.
 *
 * This is what `commitAnswer` uses on the server: we don't validate the
 * whole block (the client typically commits one answer at a time), only
 * the slug that was committed. Returns the parsed value or throws a
 * `z.ZodError`.
 */
export function validateSingleAnswer(
  serialized: SerializedSchema,
  slug: string,
  value: unknown,
  iDontKnow: boolean,
): { value: unknown } {
  if (iDontKnow) {
    // FR-018: "I don't know" is always accepted; downstream confidence is
    // lowered on the answer row. We don't attempt to coerce the value.
    return { value: null };
  }
  const field = serialized.shape[slug];
  if (!field) {
    throw new Error(`Unknown question slug: ${slug}`);
  }
  const zod = buildFieldZod(field);
  const parsed = zod.parse(value);
  return { value: parsed };
}
