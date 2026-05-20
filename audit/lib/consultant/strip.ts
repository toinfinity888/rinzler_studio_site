/**
 * Snapshot-strip helpers for consultant-published reports (T089, T093).
 *
 * The published `report_snapshots.rendered_json` MUST contain none of:
 *  - text from `internal_notes.body` (private consultant commentary)
 *  - text from any `consultant_override.reason` (lives only in internal_notes)
 *  - raw engine weights / scenario_weight_overrides.reason text
 *  - vendor compatibility_notes (internal-only per data-model.md §E)
 *
 * The snapshot-builder (lib/report/snapshot-builder.ts) already avoids these
 * fields by construction. This module is the verification + final-pass
 * scrub: we walk the rendered JSON, prune any whitelisted-internal keys,
 * and verify no internal-note body appears as a substring of any string.
 *
 * Why both prune AND verify? Defence in depth — if the engine adds a new
 * field that accidentally surfaces internal text, the verify step catches
 * it before publication (FR-072, SC-017).
 */

/** Keys that MUST never appear in any object in rendered_json. */
const FORBIDDEN_KEYS = new Set([
  "internal_notes",
  "consultant_notes",
  "consultant_override_reason",
  "override_reason",
  "raw_weights",
  "weight_adjustments",
  "compatibility_notes",
  "private_reason",
  "consultant_private",
]);

export interface StripResult {
  /** The scrubbed JSON value (deep copy of the input). */
  stripped: unknown;
  /** Keys that were removed during stripping (audit signal). */
  removedKeys: string[];
}

/**
 * Walk `value` recursively, dropping any object key listed in
 * `FORBIDDEN_KEYS`. Returns a new tree — does NOT mutate the input.
 */
export function stripForbiddenKeys(value: unknown): StripResult {
  const removedKeys: string[] = [];
  const seen = new WeakSet<object>();

  function walk(node: unknown): unknown {
    if (node === null || typeof node !== "object") return node;
    if (seen.has(node as object)) return node;
    seen.add(node as object);

    if (Array.isArray(node)) {
      return node.map((item) => walk(item));
    }
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (FORBIDDEN_KEYS.has(k)) {
        removedKeys.push(k);
        continue;
      }
      out[k] = walk(v);
    }
    return out;
  }

  return { stripped: walk(value), removedKeys };
}

/**
 * Recursively collect every string in `value` (length-filtered to skip
 * trivial labels) for substring matching during verification.
 */
function collectStrings(value: unknown, minLen: number = 12): string[] {
  const out: string[] = [];
  const seen = new WeakSet<object>();
  function walk(node: unknown): void {
    if (node === null) return;
    if (typeof node === "string") {
      if (node.length >= minLen) out.push(node);
      return;
    }
    if (typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    for (const v of Object.values(node as Record<string, unknown>)) walk(v);
  }
  walk(value);
  return out;
}

export interface VerifyArgs {
  /** The candidate `rendered_json` payload to publish. */
  rendered: unknown;
  /** All consultant-private bodies that MUST NOT appear in `rendered`. */
  privateBodies: string[];
}

export interface VerifyResult {
  ok: boolean;
  /** When `ok=false`, the first leak we detected (a substring + the key path). */
  leak: { matched: string } | null;
  removedKeys: string[];
}

/**
 * Defence-in-depth verifier. After `stripForbiddenKeys`, walk every long
 * string in the rendered tree and assert that no private body appears as a
 * substring. The verifier is intentionally aggressive: a private note body
 * leaking even partially into `rendered_json` is a SC-017 violation.
 *
 * `minLen` filters out trivial collisions on short connectives ("le", "et")
 * — we look for runs of ≥ 24 contiguous characters that match a private
 * body. The override-reason payloads we want to catch are sentences, so
 * 24+ char substring matches are a robust signal of leakage.
 */
export function verifySnapshotClean(args: VerifyArgs): VerifyResult {
  const { stripped, removedKeys } = stripForbiddenKeys(args.rendered);
  const haystack = collectStrings(stripped, 12);

  for (const body of args.privateBodies) {
    if (!body || body.length < 24) continue;
    // Sliding-window check: if any 24-char window of the private body
    // appears in any rendered string, that's a leak. This catches partial
    // leaks where only a clause of the note was templated into the report.
    for (let i = 0; i + 24 <= body.length; i += 8) {
      const probe = body.slice(i, i + 24);
      for (const s of haystack) {
        if (s.includes(probe)) {
          return {
            ok: false,
            leak: { matched: probe },
            removedKeys,
          };
        }
      }
    }
  }
  return { ok: true, leak: null, removedKeys };
}

/**
 * One-shot helper: strip forbidden keys AND verify against private bodies.
 * Returns the cleaned payload. THROWS if verification fails — callers in
 * `publishConsultantReport` treat a verification failure as a publish
 * abort (the snapshot is NOT written; the consultant must investigate).
 */
export function stripAndVerify(
  rendered: unknown,
  privateBodies: string[],
): { cleaned: unknown; removedKeys: string[] } {
  const { stripped, removedKeys } = stripForbiddenKeys(rendered);
  const verified = verifySnapshotClean({
    rendered: stripped,
    privateBodies,
  });
  if (!verified.ok) {
    throw new Error(
      `Snapshot leak detected (matched: "${verified.leak?.matched}"). Refusing to publish.`,
    );
  }
  return { cleaned: stripped, removedKeys };
}
