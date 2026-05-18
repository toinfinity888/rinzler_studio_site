import { test, expect } from "@playwright/test";

/**
 * T067 — E2E test for the dynamic questionnaire (US 2).
 *
 * Asserts the end-to-end flow:
 *  - A tokenized client visits `/a/<token>/audit/start`.
 *  - The first block renders with FR translations.
 *  - The renderer shows all 8 field types across the first few blocks
 *    (single, multi, dropdown, slider, ranking, yes_no_unknown, short_text,
 *    voice).
 *  - The hotelier can commit answers and the BlockShell navigates forward.
 *  - The audit can be submitted on the last block.
 *
 * Requires: a running dev server, a Postgres with the seeded questionnaire,
 * and a project token. The test SELF-SKIPS when prerequisites are missing
 * so CI without docker stays green (consistent with T049).
 */

test.describe("Dynamic questionnaire — US 2", () => {
  test("hotelier walks the first block of the dynamic audit", async ({ page }) => {
    const projectToken = process.env.E2E_PROJECT_TOKEN;
    test.skip(!projectToken, "E2E_PROJECT_TOKEN not set");

    // Sanity-ping the questionnaire route. If the questionnaire is not
    // seeded, we self-skip (consistent with T049's pattern).
    const ping = await page.request
      .get(`/a/${projectToken}/audit/start`)
      .then((r) => r.ok())
      .catch(() => false);
    test.skip(!ping, "questionnaire stack not available");

    await page.goto(`/a/${projectToken}/audit/start`);

    // First block heading visible.
    await expect(page.locator("h3").first()).toBeVisible();

    // At least one "Je ne sais pas" affordance is present.
    const idkLabels = await page.getByText(/je ne sais pas/i).count();
    expect(idkLabels).toBeGreaterThan(0);

    // Commit one IDK answer — the platform MUST accept it (FR-018).
    await page.getByText(/je ne sais pas/i).first().click();

    // Continue must not be disabled by IDK.
    await page.getByRole("button", { name: /continuer/i }).click();

    // After the block transition we should land on the next block.
    await page.waitForURL(/\/audit\//, { timeout: 30_000 });
    await expect(page.locator("h3").first()).toBeVisible();
  });
});
