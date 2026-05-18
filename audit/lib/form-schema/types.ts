/**
 * Declarative form schema — single source of truth (FR-023, FR-045).
 * SectionRenderer iterates these definitions; FR copy is keyed by `field.id`
 * in `lib/form-schema/fr.ts`. Adding a new field in V1.x is a one-file change
 * here + a matching entry in fr.ts.
 */

export type FieldType =
  | "text"
  | "email"
  | "url"
  | "number"
  | "select"
  | "multiselect"
  | "slider"
  | "textarea"
  | "radio-group"
  | "system-block";

export type SystemCategory =
  | "pms"
  | "booking_engine"
  | "channel_manager"
  | "website_cms"
  | "crm"
  | "payment"
  | "review_management"
  | "housekeeping"
  | "communication"
  | "other_operational";

export interface FieldValidation {
  /** Hard cap for `text` / `textarea` / `email` / `url`. */
  maxLength?: number;
  /** Min/max for `number` and `slider`. */
  min?: number;
  max?: number;
  /** For `select` / `multiselect` / `radio-group`. */
  options?: readonly string[];
}

export interface FieldDef {
  /** Stable, snake_cased, section-prefixed (e.g. `s1.hotel_name`). */
  id: string;
  type: FieldType;
  required?: boolean;
  /** Help-text key looked up in fr.ts (`FR[id].help`). */
  hasHelp?: boolean;
  validation?: FieldValidation;
  /** For slider: labels for the low and high poles (FR keys). */
  sliderPoles?: { low: string; high: string };
  /**
   * For `system-block` only: the system category. The block expands to 5
   * sub-fields (provider, monthly_cost, contract_status, satisfaction,
   * frustrations) all stored under composite ids `s2.<cat>.<sub>`.
   */
  systemCategory?: SystemCategory;
  /** Optional default weight applied by the completion calculator. */
  weight?: number;
}

export interface SectionDef {
  /** `s1` … `s8`. */
  id: `s${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  /** Index in the wizard (1..8). */
  order: number;
  fields: readonly FieldDef[];
}

export type Sections = readonly SectionDef[];

/** Sub-fields auto-derived for every `system-block` field. */
export const SYSTEM_BLOCK_SUBFIELDS = [
  "provider",
  "monthly_cost",
  "contract_status",
  "satisfaction",
  "frustrations",
] as const;
export type SystemBlockSubfield = (typeof SYSTEM_BLOCK_SUBFIELDS)[number];

/**
 * Composite field id for a system-block sub-field.
 * `systemFieldId("s2.pms", "provider")` → `s2.pms.provider`.
 */
export function systemFieldId(blockId: string, sub: SystemBlockSubfield): string {
  return `${blockId}.${sub}`;
}

/** All concrete answer field ids (expands system-blocks into 5 sub-fields each). */
export function expandFieldIds(sections: Sections): string[] {
  const ids: string[] = [];
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.type === "system-block") {
        for (const sub of SYSTEM_BLOCK_SUBFIELDS) ids.push(systemFieldId(f.id, sub));
      } else {
        ids.push(f.id);
      }
    }
  }
  return ids;
}
