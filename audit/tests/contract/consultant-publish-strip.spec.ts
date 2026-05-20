import { describe, it, expect } from "vitest";

import {
  stripForbiddenKeys,
  verifySnapshotClean,
  stripAndVerify,
} from "@/lib/consultant/strip";

/**
 * T093 — Contract test: `publishConsultantReport` snapshot strip (SC-017).
 *
 * The strip layer is the single point that guarantees no internal_notes
 * body and no consultant_override.reason text reaches `rendered_json` /
 * the client-facing surface. This test exercises the strip helpers in
 * isolation — no DB, no auth, no worker. The real publish path
 * (`lib/consultant/publish.ts`) calls into these exact helpers and
 * ABORTS on any leak.
 *
 * What we assert:
 *  1. Forbidden keys are dropped wherever they appear in the tree.
 *  2. A private note body that accidentally appears as a substring in
 *     ANY rendered string is detected as a leak.
 *  3. A clean snapshot passes verification with no removed keys.
 *  4. `stripAndVerify` throws when a leak is detected (so the publish
 *     transaction aborts before writing the snapshot).
 */

describe("consultant publish — forbidden-key stripping (SC-017)", () => {
  it("drops `internal_notes` wherever it appears", () => {
    const input = {
      executive_summary: "OK",
      metadata: {
        internal_notes: "private commentary",
        rule_engine_version: "v1",
      },
      scenarios: [
        {
          kind: "minimal",
          internal_notes: ["leak"],
          title: "Scenario",
        },
      ],
    };
    const { stripped, removedKeys } = stripForbiddenKeys(input);
    const json = JSON.stringify(stripped);
    expect(json).not.toContain("internal_notes");
    expect(json).not.toContain("private commentary");
    expect(removedKeys).toContain("internal_notes");
    expect(removedKeys.length).toBeGreaterThanOrEqual(2);
  });

  it("drops every documented forbidden key", () => {
    const input = {
      consultant_notes: "x",
      consultant_override_reason: "y",
      override_reason: "z",
      raw_weights: { a: 1 },
      weight_adjustments: [],
      compatibility_notes: "internal",
      private_reason: "p",
      consultant_private: "cp",
      keep_me: "kept",
    };
    const { stripped } = stripForbiddenKeys(input);
    expect(stripped).toEqual({ keep_me: "kept" });
  });

  it("returns a deep copy — input is not mutated", () => {
    const input = {
      executive_summary: "x",
      metadata: { internal_notes: "leak" },
    };
    const before = JSON.parse(JSON.stringify(input));
    stripForbiddenKeys(input);
    expect(input).toEqual(before);
  });
});

describe("consultant publish — verifySnapshotClean (SC-017)", () => {
  it("returns ok for a clean snapshot", () => {
    const rendered = {
      executive_summary: "Audit pour hôtel test",
      recommendations: [{ id: "r1", action: "déployer FAQ" }],
    };
    const r = verifySnapshotClean({ rendered, privateBodies: [] });
    expect(r.ok).toBe(true);
    expect(r.leak).toBeNull();
  });

  it("detects a private note body leaking into a rendered string", () => {
    const privateBody =
      "Le client ne veut pas reconnaître que son taux de réservation directe est anémique";
    const rendered = {
      executive_summary: `Synthèse — ${privateBody} — et cela explique le résultat.`,
    };
    const r = verifySnapshotClean({
      rendered,
      privateBodies: [privateBody],
    });
    expect(r.ok).toBe(false);
    expect(r.leak).not.toBeNull();
  });

  it("detects partial leaks (≥ 24-char clause)", () => {
    const privateBody =
      "Note interne consultant : le PMS actuel limite la marge de manoeuvre sur la vraie automatisation guest.";
    // Only a clause leaked into the snapshot.
    const rendered = {
      recommendations: [
        {
          id: "r1",
          explanation: {
            relevance:
              "On note que le PMS actuel limite la marge de manoeuvre — à explorer.",
          },
        },
      ],
    };
    const r = verifySnapshotClean({
      rendered,
      privateBodies: [privateBody],
    });
    expect(r.ok).toBe(false);
  });

  it("ignores trivial private bodies (under 24 chars)", () => {
    const rendered = { executive_summary: "ok" };
    const r = verifySnapshotClean({
      rendered,
      privateBodies: ["short"],
    });
    expect(r.ok).toBe(true);
  });
});

describe("consultant publish — stripAndVerify (publish gate)", () => {
  it("throws when a leak is detected after stripping", () => {
    const body =
      "Cette note interne ne doit jamais apparaitre dans le rapport publié";
    const rendered = {
      // The strip layer removes top-level forbidden keys but the body
      // could still appear as text inside another field — that's what
      // verify catches.
      executive_summary: `Synthèse: ${body}.`,
    };
    expect(() => stripAndVerify(rendered, [body])).toThrow(/leak detected/i);
  });

  it("returns the cleaned payload when no leak is present", () => {
    const rendered = {
      executive_summary: "Audit clean",
      metadata: { internal_notes: "should be stripped" },
    };
    const { cleaned, removedKeys } = stripAndVerify(rendered, []);
    expect(JSON.stringify(cleaned)).not.toContain("internal_notes");
    expect(JSON.stringify(cleaned)).not.toContain("should be stripped");
    expect(removedKeys).toContain("internal_notes");
  });
});
