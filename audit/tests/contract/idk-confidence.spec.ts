import { describe, it, expect } from "vitest";

import { validateSingleAnswer } from "@/lib/questionnaire/schema-builder";
import type { SerializedSchema } from "@/lib/questionnaire/types";

/**
 * T066 — Contract test for FR-018.
 *
 * "I don't know" MUST always be accepted; it MUST be recorded with lowered
 * confidence; it MUST NOT block progression even on required questions.
 *
 * The full DB write is integration-level (covered by E2E in T067). The
 * pure-pipeline assertions are:
 *
 *  1. `validateSingleAnswer(..., iDontKnow=true)` returns `value: null`
 *     regardless of how malformed the supplied `value` is.
 *  2. The schema for a question that says `required: true` does NOT reject
 *     the IDK path — it short-circuits before parsing.
 */

const SCHEMA_DROPDOWN: SerializedSchema = {
  type: "object",
  shape: {
    pms_vendor: {
      kind: "dropdown",
      required: true,
      options: ["mews", "cloudbeds", "none"],
    },
  },
};

const SCHEMA_SLIDER: SerializedSchema = {
  type: "object",
  shape: {
    direct_booking_share: {
      kind: "slider",
      min: 0,
      max: 100,
      step: 5,
      required: true,
    },
  },
};

describe('"I don\'t know" — FR-018 contract', () => {
  it("returns null without parsing when iDontKnow is true (dropdown)", () => {
    const out = validateSingleAnswer(SCHEMA_DROPDOWN, "pms_vendor", undefined, true);
    expect(out.value).toBeNull();
  });

  it("returns null even when the supplied value is malformed", () => {
    const out = validateSingleAnswer(
      SCHEMA_DROPDOWN,
      "pms_vendor",
      { not_a_string: 42 },
      true,
    );
    expect(out.value).toBeNull();
  });

  it("returns null on required slider — IDK never blocks progression", () => {
    const out = validateSingleAnswer(
      SCHEMA_SLIDER,
      "direct_booking_share",
      undefined,
      true,
    );
    expect(out.value).toBeNull();
  });

  it("rejects a malformed value when IDK is NOT set (sanity baseline)", () => {
    expect(() =>
      validateSingleAnswer(SCHEMA_DROPDOWN, "pms_vendor", "not-an-option", false),
    ).toThrow();
  });
});
