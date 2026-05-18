/**
 * Server-side PII redactor (T024 — R9, FR-013).
 *
 * Strips: email, phone, IBAN, PAN (payment-card primary account number),
 * French national-ID-like patterns ("numéro de sécurité sociale"), generic
 * person-name heuristics ("Mr/Mme/M./Mr.").
 *
 * Returns `{ redactedPayload, categoriesMatched }`. The categoriesMatched list
 * is persisted on `voice_captures.redaction_categories_matched` for audit /
 * compliance demonstration.
 *
 * NOTE: This is a defense-in-depth layer. The PROVIDERS the platform uses
 * (Bedrock Frankfurt, Deepgram EU) are EU-hosted under DPA — but per
 * Principle I we still redact identifiers from the prompt payload.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type RedactionCategory =
  | "email"
  | "phone"
  | "iban"
  | "pan"
  | "national_id"
  | "person_name";

const PATTERNS: Array<{ category: RedactionCategory; re: RegExp; replacement: string }> = [
  {
    category: "email",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[redacted:email]",
  },
  {
    category: "phone",
    // Loose phone matcher: optional +, country code, then 8+ digits with separators.
    re: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,4}\d{2,4}/g,
    replacement: "[redacted:phone]",
  },
  {
    category: "iban",
    re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,
    replacement: "[redacted:iban]",
  },
  {
    category: "pan",
    re: /\b(?:\d[ -]?){13,19}\b/g,
    replacement: "[redacted:pan]",
  },
  {
    category: "national_id",
    // French NIR: 13 digits + 2 control digits. Loose form: 15 consecutive digits.
    re: /\b\d{13,15}\b/g,
    replacement: "[redacted:national_id]",
  },
  {
    category: "person_name",
    // Common French/EN salutations followed by a capitalized name.
    re: /\b(?:M\.|Mr\.?|Mme\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?/g,
    replacement: "[redacted:person]",
  },
];

export interface RedactionResult<T> {
  redactedPayload: T;
  categoriesMatched: RedactionCategory[];
}

export function redactString(input: string): RedactionResult<string> {
  let s = input;
  const matched = new Set<RedactionCategory>();
  for (const { category, re, replacement } of PATTERNS) {
    if (re.test(s)) {
      matched.add(category);
      s = s.replace(re, replacement);
    }
  }
  return { redactedPayload: s, categoriesMatched: Array.from(matched) };
}

/**
 * Deep-redact a JSON-ish payload: strings are run through `redactString`;
 * arrays + objects are walked. Non-string scalars pass through untouched.
 */
export function redactPayload<T>(input: T): RedactionResult<T> {
  const matched = new Set<RedactionCategory>();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      const r = redactString(v);
      r.categoriesMatched.forEach((c) => matched.add(c));
      return r.redactedPayload;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return {
    redactedPayload: walk(input) as T,
    categoriesMatched: Array.from(matched),
  };
}
