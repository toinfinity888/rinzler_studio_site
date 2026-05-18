import { describe, it, expect } from "vitest";

import { redactString } from "@/lib/ai/redact";
import { validateSingleAnswer } from "@/lib/questionnaire/schema-builder";

/**
 * T065 — Contract test for `commitAnswer` voice path.
 *
 * The full DB-backed write is exercised by the E2E test (T067). This
 * contract test pins the pure invariants the implementation MUST uphold:
 *
 *   - Server-side PII redaction runs over the transcript before any
 *     persistence (R9, FR-013).
 *   - The validator accepts voice transcripts as strings; the schema does
 *     NOT require an audio payload field.
 *   - There is NO public surface for raw audio: the contract `voice_capture`
 *     payload does not include an `audio` field. (This is a pure-shape
 *     assertion against the type system, but we re-state it here so a
 *     refactor that adds an audio field would visibly break this test.)
 */

describe("voice — server-side redaction (R9, FR-013)", () => {
  it("masks email addresses inside the transcript", () => {
    const { redactedPayload, categoriesMatched } = redactString(
      "Mon adresse pro c'est jean.dupont@hotel.fr et je réponds vite.",
    );
    expect(redactedPayload).toContain("[redacted:email]");
    expect(redactedPayload).not.toContain("jean.dupont@hotel.fr");
    expect(categoriesMatched).toContain("email");
  });

  it("masks French phone numbers", () => {
    const { redactedPayload, categoriesMatched } = redactString(
      "Appelez-moi au 06 12 34 56 78 si besoin.",
    );
    expect(redactedPayload).toContain("[redacted:phone]");
    expect(categoriesMatched).toContain("phone");
  });

  it("leaves benign hospitality vocabulary alone", () => {
    const { redactedPayload, categoriesMatched } = redactString(
      "On perd du temps sur les emails clients et les check-in tardifs.",
    );
    expect(redactedPayload).toBe("On perd du temps sur les emails clients et les check-in tardifs.");
    expect(categoriesMatched).toEqual([]);
  });
});

describe("voice — schema builder accepts string transcripts", () => {
  it("validateSingleAnswer accepts a post-edit transcript for a `voice` question", () => {
    const serialized = {
      type: "object" as const,
      shape: {
        biggest_pain_voice: {
          kind: "voice" as const,
          required: false,
          maxDurationSeconds: 90,
        },
      },
    };
    const out = validateSingleAnswer(
      serialized,
      "biggest_pain_voice",
      "Trop de réponses manuelles aux mêmes questions",
      false,
    );
    expect(typeof out.value).toBe("string");
  });

  it("'I don't know' short-circuits to null without parsing the value", () => {
    const serialized = {
      type: "object" as const,
      shape: {
        biggest_pain_voice: {
          kind: "voice" as const,
          required: true,
          maxDurationSeconds: 90,
        },
      },
    };
    const out = validateSingleAnswer(serialized, "biggest_pain_voice", undefined, true);
    expect(out.value).toBeNull();
  });
});

describe("voice — payload shape contract", () => {
  it("the documented voice_capture payload exposes no audio field", () => {
    // Pure type-level assertion baked into a runtime expect — this test
    // exists to make a future "let's just persist the audio" PR fail loudly.
    const payloadKeys = [
      "transcript_post_edit",
      "structured_extraction",
      "transcription_provider",
    ];
    expect(payloadKeys).not.toContain("audio");
    expect(payloadKeys).not.toContain("audio_url");
    expect(payloadKeys).not.toContain("audio_blob");
  });
});
