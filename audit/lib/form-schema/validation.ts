import { z, type ZodTypeAny } from "zod";
import type { FieldDef, SectionDef, Sections } from "./types";
import { SYSTEM_BLOCK_SUBFIELDS, systemFieldId } from "./types";

/**
 * Build a Zod schema validating ONLY required fields (FR-010 + FR-022 cap).
 * Optional fields use `.optional()` so the client can submit partial data
 * during autosave; full schema is enforced only at `submitAudit` time on
 * required fields, which is what FR-010 requires.
 *
 * Per the C4 finding fix: every textarea field gets a hard `.max(5000)`
 * server-side regardless of required/optional, closing the long-free-text
 * edge case for Section 8 + every "frustrations" field.
 */
function fieldZod(field: FieldDef): ZodTypeAny {
  const v = field.validation ?? {};
  switch (field.type) {
    case "text": {
      let s: ZodTypeAny = z.string().min(1, "required");
      if (v.maxLength) s = (s as z.ZodString).max(v.maxLength);
      return s;
    }
    case "email": {
      let s: ZodTypeAny = z.string().email().min(1);
      if (v.maxLength) s = (s as z.ZodString).max(v.maxLength);
      return s;
    }
    case "url": {
      let s: ZodTypeAny = z.string().url();
      if (v.maxLength) s = (s as z.ZodString).max(v.maxLength);
      return s;
    }
    case "number": {
      let n: ZodTypeAny = z.number();
      if (v.min !== undefined) n = (n as z.ZodNumber).min(v.min);
      if (v.max !== undefined) n = (n as z.ZodNumber).max(v.max);
      return n;
    }
    case "slider": {
      const min = v.min ?? 1;
      const max = v.max ?? 10;
      return z.number().int().min(min).max(max);
    }
    case "select":
    case "radio-group": {
      if (v.options && v.options.length) {
        return z.enum(v.options as readonly [string, ...string[]]);
      }
      return z.string();
    }
    case "multiselect": {
      if (v.options && v.options.length) {
        return z.array(z.enum(v.options as readonly [string, ...string[]]));
      }
      return z.array(z.string());
    }
    case "textarea":
      return z.string().max(5000, "too_long");
    case "system-block":
      // Composite — handled by sub-field expansion below.
      return z.unknown();
  }
}

export interface BuiltSchema {
  /** All field ids (system-blocks expanded). */
  allFieldIds: string[];
  /** Required field ids (validated at submitAudit time per FR-010). */
  requiredFieldIds: string[];
  /** Per-field-id Zod schemas for type validation on every autosave. */
  perField: Record<string, ZodTypeAny>;
  /** Required-only object schema used by submitAudit. */
  requiredObject: z.ZodObject<Record<string, ZodTypeAny>>;
}

export function buildZodSchema(sections: Sections): BuiltSchema {
  const allFieldIds: string[] = [];
  const requiredFieldIds: string[] = [];
  const perField: Record<string, ZodTypeAny> = {};
  const requiredShape: Record<string, ZodTypeAny> = {};

  for (const section of sections as readonly SectionDef[]) {
    for (const field of section.fields) {
      if (field.type === "system-block") {
        for (const sub of SYSTEM_BLOCK_SUBFIELDS) {
          const id = systemFieldId(field.id, sub);
          allFieldIds.push(id);
          // Sub-fields are typed independently — provider/frustrations are
          // free text capped at 5000, monthly_cost is number, others enum.
          if (sub === "provider")
            perField[id] = z.string().max(200);
          else if (sub === "frustrations")
            perField[id] = z.string().max(5000);
          else if (sub === "monthly_cost")
            perField[id] = z.number().min(0).max(1_000_000);
          else if (sub === "contract_status")
            perField[id] = z.enum([
              "month_to_month",
              "annual",
              "multi_year",
              "expired",
              "unknown",
            ]);
          else if (sub === "satisfaction")
            perField[id] = z.enum([
              "very_unsatisfied",
              "unsatisfied",
              "neutral",
              "satisfied",
              "very_satisfied",
            ]);
        }
        continue;
      }
      allFieldIds.push(field.id);
      const zodForField = fieldZod(field);
      perField[field.id] = zodForField;
      if (field.required) {
        requiredFieldIds.push(field.id);
        requiredShape[field.id] = zodForField;
      }
    }
  }

  return {
    allFieldIds,
    requiredFieldIds,
    perField,
    requiredObject: z.object(requiredShape),
  };
}

/**
 * Validate one autosave payload field-by-field. Unknown field ids are
 * rejected. Returns { valid, invalid } so partial saves are persisted
 * rather than rejected wholesale.
 */
export function validatePartial(
  partial: Record<string, unknown>,
  schema: BuiltSchema,
): {
  valid: Record<string, unknown>;
  invalid: { fieldId: string; reason: string }[];
} {
  const valid: Record<string, unknown> = {};
  const invalid: { fieldId: string; reason: string }[] = [];

  for (const [fieldId, value] of Object.entries(partial)) {
    const fieldSchema = schema.perField[fieldId];
    if (!fieldSchema) {
      invalid.push({ fieldId, reason: "unknown_field" });
      continue;
    }
    // Allow null/empty-string to clear a value.
    if (value === null || value === "") {
      valid[fieldId] = null;
      continue;
    }
    const result = fieldSchema.safeParse(value);
    if (result.success) {
      valid[fieldId] = result.data;
    } else {
      invalid.push({ fieldId, reason: result.error.issues[0]?.code ?? "invalid" });
    }
  }
  return { valid, invalid };
}
