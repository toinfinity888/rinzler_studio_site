import { test, expect } from "@playwright/test";

/**
 * T094 — E2E test for the consultant override + publish flow (US 4, SC-017).
 *
 * The test:
 *   1. Logs in to /admin as the seeded super_admin (admin@rinzlerstudio.local).
 *   2. Opens the consultant workspace for E2E_PROJECT_ID.
 *   3. Applies a budget override with a private justification.
 *   4. Triggers the consultant publish path.
 *   5. Loads the client incognito view (E2E_PROJECT_TOKEN) and asserts the
 *      private note body does NOT appear anywhere on the public report page.
 *
 * Skips when any of the following are missing — mirrors the T049 pattern so
 * CI without the local stack stays green:
 *   E2E_PROJECT_ID, E2E_PROJECT_TOKEN — set after `npm run db:test-project`.
 */

const PROJECT_ID = process.env.E2E_PROJECT_ID;
const PROJECT_TOKEN = process.env.E2E_PROJECT_TOKEN;
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@rinzlerstudio.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "demo-password-12345";

test.describe("Consultant workspace — override + publish (US 4)", () => {
  test("override is applied; private note does not leak into client view", async ({
    browser,
    page,
  }) => {
    test.skip(
      !PROJECT_ID || !PROJECT_TOKEN,
      "E2E_PROJECT_ID / E2E_PROJECT_TOKEN not set — run `npm run db:test-project` and re-export.",
    );

    // Cheap reachability probe — same pattern as free-scan.spec.ts.
    const adminReady = await page.request
      .get(`/admin/login`)
      .then((r) => r.ok())
      .catch(() => false);
    test.skip(!adminReady, "admin stack not reachable");

    // 1) Log in.
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await Promise.all([
      page.waitForURL(/\/admin\/projects/),
      page.getByRole("button", { name: /connexion|se connecter/i }).click(),
    ]);

    // 2) Open the consultant workspace.
    await page.goto(`/admin/consultant/${PROJECT_ID}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Consultant workspace")).toBeVisible();

    // 3) Apply an override on the first available answer slug. We don't
    //    rely on a specific slug being present — find any "Override cette
    //    réponse" button and use it.
    const overrideButton = page.getByRole("button", { name: /override/i }).first();
    if (await overrideButton.isVisible().catch(() => false)) {
      await overrideButton.click();
      // The inline form opens with two fields: value + justification.
      await page.getByPlaceholder(/Saisir la valeur révisée/i).fill("moderate");
      const privateBody =
        "Note interne consultant : le budget réel observé est modéré et non low; corrigé pour ce diagnostic.";
      await page.getByPlaceholder(/Pourquoi cette correction/i).fill(privateBody);
      await Promise.all([
        page.waitForSelector("text=/Override enregistré|enregistré/i", {
          timeout: 30_000,
        }),
        page.getByRole("button", { name: /Appliquer l'override/i }).click(),
      ]);

      // 4) Trigger publish.
      const publishButton = page.getByRole("button", {
        name: /Publier \(consultant_finalized\)/i,
      });
      await publishButton.click();
      await page.waitForSelector("text=/Snapshot publié|publié/i", {
        timeout: 30_000,
      });

      // 5) Cross-context check: load the client report view in a fresh
      //    incognito context — no session, only the token. Verify the
      //    private body NEVER appears on the page.
      const incognito = await browser.newContext();
      const clientPage = await incognito.newPage();
      await clientPage.goto(`/a/${PROJECT_TOKEN}/report`);
      // Give the page a moment to fully render; tolerate slow snapshot
      // build by polling for the executive summary.
      await clientPage.waitForLoadState("networkidle");
      const fullText = await clientPage.locator("body").innerText();
      expect(fullText).not.toContain(privateBody);
      // Also assert no probe substring from the private body appears.
      expect(fullText).not.toContain(
        privateBody.slice(0, 40), // first 40 chars — well above leak threshold
      );
      await incognito.close();
    } else {
      test.skip(true, "No answers available to override on the test project.");
    }
  });
});
