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
}
