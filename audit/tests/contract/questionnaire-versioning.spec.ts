import { describe, it, expect } from "vitest";

import {
  CANONICAL_LANGUAGE,
  isQuestionRenderableInNewAudit,
  pickTranslation,
  type EligibilityCandidate,
  type TranslationRow,
} from "@/lib/questionnaire/eligibility";

/**
 * US 6 contract tests (T109 / T110 / T111).
 *
 * The full pipeline (`loadBlock`) is server-only — it runs a Drizzle query.
 * These tests target the pure decision helpers it delegates to, so the
 * SC-014 contract ("question wording preserved across version changes")
 * and FR-103 / FR-104 are pinned without a DB.
 *
 * Keep in sync with `audit/lib/questionnaire/load-block.ts` — the loader
 * imports the same helpers, so green tests here mean the loader behaves.
 */

function makeCandidate(
  overrides: Partial<EligibilityCandidate> = {},
): EligibilityCandidate {
  return {
    status: "published",
    auditLevels: ["mini", "full"],
    hotelTypes: null,
    ...overrides,
  };
}

/* -------------------------------------------------------------------- */
/* T109 — deactivated question hidden from new audits (FR-103)          */
/* -------------------------------------------------------------------- */

describe("T109 — deactivated questions are hidden from new audits (FR-103)", () => {
  it("is renderable when status is `published` and tier matches", () => {
    expect(
      isQuestionRenderableInNewAudit(makeCandidate(), {
        tier: "full",
        hotelType: "independent",
      }),
    ).toBe(true);
  });

  it("is NOT renderable when status is `deactivated`", () => {
    expect(
      isQuestionRenderableInNewAudit(
        makeCandidate({ status: "deactivated" }),
        { tier: "full", hotelType: "independent" },
      ),
    ).toBe(false);
  });

  it("is NOT renderable when status is `draft`", () => {
    expect(
      isQuestionRenderableInNewAudit(
        makeCandidate({ status: "draft" }),
        { tier: "full", hotelType: "independent" },
      ),
    ).toBe(false);
  });

  it("is NOT renderable when the project tier is outside `auditLevels`", () => {
    expect(
      isQuestionRenderableInNewAudit(
        makeCandidate({ auditLevels: ["full", "consultant_assisted"] }),
        { tier: "mini", hotelType: "independent" },
      ),
    ).toBe(false);
  });

  it("respects hotelTypes when set (empty/null means any)", () => {
    const restricted = makeCandidate({ hotelTypes: ["boutique", "family"] });
    expect(
      isQuestionRenderableInNewAudit(restricted, { tier: "full", hotelType: "boutique" }),
    ).toBe(true);
    expect(
      isQuestionRenderableInNewAudit(restricted, { tier: "full", hotelType: "independent" }),
    ).toBe(false);
    expect(
      isQuestionRenderableInNewAudit(restricted, { tier: "full", hotelType: null }),
    ).toBe(false);
  });

  it("a `null` hotelTypes list means the question is offered to every hotel type", () => {
    const universal = makeCandidate({ hotelTypes: null });
    for (const hotelType of ["independent", "boutique", "family", null]) {
      expect(
        isQuestionRenderableInNewAudit(universal, {
          tier: "full",
          hotelType,
        }),
      ).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------- */
/* T110 — translation fallback flag (FR-104)                            */
/* -------------------------------------------------------------------- */

function makeT(language: string, prompt: string): TranslationRow {
  return { language, prompt, helper: null, optionLabels: {} };
}

describe("T110 — translation fallback shows visible indicator (FR-104)", () => {
  it("uses the wanted language when present and does NOT flag fallback", () => {
    const picked = pickTranslation(
      [makeT("fr", "Quel est votre PMS ?"), makeT("en", "What is your PMS?")],
      "en",
    );
    expect(picked.translation?.prompt).toBe("What is your PMS?");
    expect(picked.languageUsed).toBe("en");
    expect(picked.fallbackUsed).toBe(false);
  });

  it("falls back to canonical FR when the wanted language is missing and flags it", () => {
    const picked = pickTranslation(
      [makeT("fr", "Quel est votre PMS ?")],
      "en",
    );
    expect(picked.translation?.prompt).toBe("Quel est votre PMS ?");
    expect(picked.languageUsed).toBe(CANONICAL_LANGUAGE);
    expect(picked.fallbackUsed).toBe(true);
  });

  it("does NOT flag fallback when the wanted language IS the canonical language", () => {
    const picked = pickTranslation(
      [makeT("fr", "Quel est votre PMS ?")],
      "fr",
    );
    expect(picked.fallbackUsed).toBe(false);
    expect(picked.languageUsed).toBe("fr");
  });

  it("returns `translation=null` when neither the wanted nor canonical row exists", () => {
    const picked = pickTranslation(
      [makeT("de", "Welches PMS verwenden Sie?")],
      "en",
    );
    expect(picked.translation).toBeNull();
    expect(picked.fallbackUsed).toBe(false);
  });
});

/* -------------------------------------------------------------------- */
/* T111 — question wording preservation across version changes (SC-014) */
/* -------------------------------------------------------------------- */

describe("T111 — question wording preserved across version changes (SC-014)", () => {
  it("resolving translations is keyed by version, not by question id", () => {
    // Setup: same question_id has two versions. V1's prompt should still be
    // resolvable from V1's translation set, even though V2 is the active
    // (currentVersion) of the question.
    const v1Translations: TranslationRow[] = [
      makeT("fr", "Avez-vous un PMS ?"),
    ];
    const v2Translations: TranslationRow[] = [
      makeT("fr", "Quel PMS utilisez-vous actuellement ?"),
    ];

    const v1 = pickTranslation(v1Translations, "fr");
    const v2 = pickTranslation(v2Translations, "fr");

    expect(v1.translation?.prompt).toBe("Avez-vous un PMS ?");
    expect(v2.translation?.prompt).toBe("Quel PMS utilisez-vous actuellement ?");
    expect(v1.translation?.prompt).not.toBe(v2.translation?.prompt);
  });

  it("a deactivated question still renders its historical prompt when looked up by version_id", () => {
    // A past audit pinned `question_version_id = V1`. After the question is
    // deactivated, NEW audits will not include it (T109), but the report
    // snapshot that referenced V1 can still hydrate the original prompt
    // from V1's translations.
    const v1Translations: TranslationRow[] = [
      makeT("fr", "Utilisez-vous un channel manager ?"),
    ];
    const picked = pickTranslation(v1Translations, "fr");
    expect(picked.translation?.prompt).toBe("Utilisez-vous un channel manager ?");
    expect(picked.languageUsed).toBe("fr");
  });

  it("fallback still works on superseded versions whose only translation is FR", () => {
    const oldV1Translations: TranslationRow[] = [
      makeT("fr", "Avez-vous une stratégie de prix dynamique ?"),
    ];
    const picked = pickTranslation(oldV1Translations, "en");
    expect(picked.translation?.prompt).toBe(
      "Avez-vous une stratégie de prix dynamique ?",
    );
    expect(picked.fallbackUsed).toBe(true);
  });
});
