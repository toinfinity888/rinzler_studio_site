import type { Sections, SectionDef } from "./types";
import { SYSTEM_BLOCK_SUBFIELDS, systemFieldId } from "./types";

/**
 * Completion percentage = answered fields, weighted (required = 2× optional),
 * divided by total possible weighted score. System-block sub-fields are each
 * treated as one optional field (5 per category × 10 categories = 50 fields
 * in Section 2).
 */
export function computeCompletionPct(
  answers: Map<string, unknown> | Record<string, unknown>,
  sections: Sections,
): number {
  const get = (id: string): unknown => {
    if (answers instanceof Map) return answers.get(id);
    return (answers as Record<string, unknown>)[id];
  };

  let total = 0;
  let answered = 0;

  for (const section of sections as readonly SectionDef[]) {
    for (const field of section.fields) {
      if (field.type === "system-block") {
        for (const sub of SYSTEM_BLOCK_SUBFIELDS) {
          total += 1;
          if (isFilled(get(systemFieldId(field.id, sub)))) answered += 1;
        }
        continue;
      }
      const weight = field.required ? 2 : 1;
      total += weight;
      if (isFilled(get(field.id))) answered += weight;
    }
  }

  if (total === 0) return 0;
  return Math.round((answered / total) * 100);
}

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}
