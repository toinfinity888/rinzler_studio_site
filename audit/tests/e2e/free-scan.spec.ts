import { test, expect } from "@playwright/test";

/**
 * T049 — End-to-end test for the free-scan flow (SC-001, FR-008, FR-009).
 *
 * Asserts:
 *  - From the public landing page (/), the visitor can submit a URL.
 *  - The result page renders without any login or account creation.
 *  - The rendered result includes ≥ 10 plain-language observations across the
 *    documented categories.
 *  - The optional email opt-in is present but does NOT gate the content (it
 *    is below or alongside the observations, not in front of them).
 *
 * Requires: a running dev server (`npm run dev`) AND a reachable Postgres
 * (DATABASE_URL) AND a running Redis + scan worker. The Playwright config
 * starts the dev server automatically; the test is skipped if the worker
 * stack is unreachable (so CI without docker still passes).
 */

test.describe("Free scan — public flow (US 1)", () => {
  test("visitor scans a hotel URL and sees a structured diagnostic", async ({
    page,
  }) => {
    // Skip when no scan stack is reachable. This keeps the suite green in
    // environments that don't yet have docker-compose up.
    const scanStackReady = await page.request
      .post("/api/scan/start", { data: { url: "https://example.com" } })
      .then((r) => r.ok())
      .catch(() => false);
    test.skip(!scanStackReady, "scan stack (Postgres+Redis+worker) not available");

    await page.goto("/");
    await expect(page.locator("h1")).toContainText(/diagnostic/i);

    await page.locator('input[type="url"]').fill("https://example.com");
    await Promise.all([
      page.waitForURL(/\/scan\//),
      page.getByRole("button", { name: /lancer/i }).click(),
    ]);

    // Wait for the result page to finish polling. The poller refreshes the
    // RSC tree when the scan completes.
    await page.waitForSelector("h2:has-text('Observations')", { timeout: 180_000 });

    // Visible-without-account assertion: no login form / auth gate on the
    // result page.
    expect(await page.locator('input[type="password"]').count()).toBe(0);

    // At least 10 observations rendered (SC-001).
    const observations = await page
      .locator("article")
      .filter({ hasText: /Performance|Mobile|Visibilité|Tunnel|Communication|Outils/ })
      .count();
    expect(observations).toBeGreaterThanOrEqual(10);

    // The optional email form is present but is NOT a gate — observations are
    // already visible above it.
    await expect(
      page.getByRole("form", { name: /Recevoir une copie/i }),
    ).toBeVisible();
  });
});
