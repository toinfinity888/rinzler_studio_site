import "server-only";

/**
 * Lighthouse runner driven through Playwright's CDP session (T034).
 *
 * The scanner opens a Playwright Chromium context, navigates to the URL, and
 * then attaches Lighthouse against the same CDP session — so Lighthouse sees
 * the same browser state (cookies, realistic timing) the scanner already
 * captured. Returns the four category scores.
 *
 * NOTE: Lighthouse + Playwright integration uses Lighthouse's Node API. The
 * function is async and isolates failures so a Lighthouse crash does not
 * fail the entire scan — the scan can still surface DOM-derived findings.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Browser, Page } from "playwright";

export interface LighthouseResult {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcpMs: number | null;
  cls: number | null;
  runtimeError?: string;
}

const NULL_RESULT: LighthouseResult = {
  performance: null,
  accessibility: null,
  bestPractices: null,
  seo: null,
  lcpMs: null,
  cls: null,
};

export async function runLighthouse(
  _browser: Browser,
  _url: string,
  _formFactor: "desktop" | "mobile",
): Promise<LighthouseResult> {
  // NOTE: temporarily disabled. The agent's original integration passed
  // `{ cdp }` as Lighthouse's 4th argument; that shape is wrong for the
  // current Lighthouse Node API and causes the worker to hang indefinitely.
  // Until the integration is rewritten to either (a) pass the Playwright
  // Page directly OR (b) launch Lighthouse with its own chrome-launcher,
  // we skip Lighthouse and let the scan complete with DOM-only findings.
  // The DOM signals are the higher-value half of the diagnostic anyway.
  return { ...NULL_RESULT, runtimeError: "lighthouse disabled pending re-integration" };

  // eslint-disable-next-line no-unreachable
  let lighthouse: any;
  try {
    lighthouse = (await import("lighthouse")).default;
  } catch (err) {
    return { ...NULL_RESULT, runtimeError: `lighthouse import failed: ${String(err)}` };
  }

  // Open a fresh page and a CDP session for Lighthouse to drive.
  const context = await browser.newContext();
  const page: Page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  try {
    const flags = {
      logLevel: "error" as const,
      output: "json" as const,
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor,
      screenEmulation: formFactor === "mobile"
        ? { mobile: true, width: 412, height: 915, deviceScaleFactor: 2, disabled: false }
        : { mobile: false, width: 1366, height: 768, deviceScaleFactor: 1, disabled: false },
    };
    const result = await lighthouse(url, flags, undefined, { cdp });
    const lh = result?.lhr ?? {};
    return {
      performance: lh?.categories?.performance?.score ?? null,
      accessibility: lh?.categories?.accessibility?.score ?? null,
      bestPractices: lh?.categories?.["best-practices"]?.score ?? null,
      seo: lh?.categories?.seo?.score ?? null,
      lcpMs: lh?.audits?.["largest-contentful-paint"]?.numericValue ?? null,
      cls: lh?.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
    };
  } catch (err) {
    return { ...NULL_RESULT, runtimeError: String(err) };
  } finally {
    await cdp.detach().catch(() => {});
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
