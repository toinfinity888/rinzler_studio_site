import { FR, SECTION_TITLES, SYSTEM_LABELS, SYSTEM_SUB_LABELS, type FrEntry } from "./fr";
import { SYSTEM_BLOCK_SUBFIELDS, type SystemBlockSubfield } from "./types";

export type Locale = "fr";
export const DEFAULT_LOCALE: Locale = "fr";

/**
 * Lookup label / help / options for a field id. System-block sub-fields
 * (e.g. `s2.pms.provider`) are composed from SYSTEM_LABELS + SYSTEM_SUB_LABELS.
 *
 * Returns a synthetic entry that always has at least a label so renderers
 * never crash on a typo'd id (label falls back to the id itself in that case).
 */
export function t(fieldId: string): FrEntry {
  const direct = FR[fieldId];
  if (direct) return direct;

  // System-block sub-field? Pattern: s2.<category>.<sub>
  const parts = fieldId.split(".");
  if (parts.length === 3 && parts[0] === "s2") {
    const category = parts[1] as string;
    const sub = parts[2] as SystemBlockSubfield;
    const sys = SYSTEM_LABELS[category];
    const subDef = SYSTEM_SUB_LABELS[sub];
    if (sys && subDef && (SYSTEM_BLOCK_SUBFIELDS as readonly string[]).includes(sub)) {
      return {
        label: `${sys.name} — ${subDef.label}`,
        help: subDef.help ?? sys.help,
      };
    }
  }
  return { label: fieldId };
}

export function sectionTitle(sectionId: string): string {
  return SECTION_TITLES[sectionId]?.title ?? sectionId;
}

export function sectionIntro(sectionId: string): string | undefined {
  return SECTION_TITLES[sectionId]?.intro;
}

export { FR, SECTION_TITLES, SYSTEM_LABELS, SYSTEM_SUB_LABELS };
