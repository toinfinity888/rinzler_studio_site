import "server-only";

/**
 * Scan orchestrator (T037 — User Story 1).
 *
 * One call to `runScan(scanId, url)` performs:
 *   1. Launches a Playwright Chromium context (headless, no cookie carryover).
 *   2. Desktop navigation pass — captures rendered DOM, runs the DOM extractor,
 *      and triggers Lighthouse (desktop form factor).
 *   3. Mobile re-load — separate context emulating iPhone 13 to measure mobile
 *      LCP/CLS and surface the "mobile booking-path friction" signal.
 *   4. Vendor fingerprinting against the DOM signals.
 *   5. Maps raw observations into `scan_findings` rows.
 *   6. Persists findings + updates `scans.status` lifecycle.
 *
 * Failure modes (per contracts/worker-jobs.md):
 *   - Captcha / login wall heuristic -> `status='blocked'`, `error_class` set.
 *   - Network unreachable / timeout -> `status='failed'`, `error_class='unreachable'`.
 *   - Non-hotel heuristic -> `status='succeeded'`, `error_class='non_hotel'`, with a
 *     single guiding observation row.
 *
 * Idempotency: keyed on `scan_id`. Re-running deletes prior findings for the
 * same `scan_id` before re-inserting.
 *
 * NO audio persistence anywhere. NO PII writes to logs. France/EU residency
 * is honored at every external call site (Playwright runs in-process — local
 * to the worker host — so there is no third-party network call here).
 */

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  scans,
  scanFindings,
  type ScanErrorClass,
} from "@/db/schema";
import { writeAuditEntry } from "@/lib/audit-log";
import { withSpan } from "@/lib/observability/otel";
import { captureException } from "@/lib/observability/sentry";

import { extractDomSignals, type DomSignals } from "./dom-extractors";
import { runLighthouse, type LighthouseResult } from "./lighthouse-runner";
import {
  domToFindings,
  lighthouseToFindings,
  vendorFingerprintFindings,
  looksLikeHotel,
  type FindingRow,
} from "./finding-mappers";

const NAVIGATION_TIMEOUT_MS = 30_000;
const DESKTOP_VIEWPORT = { width: 1366, height: 768 } as const;
const MOBILE_VIEWPORT = { width: 412, height: 915 } as const;
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
const FRESHNESS_DAYS = 7;

export interface RunScanResult {
  status: "succeeded" | "failed" | "blocked";
  errorClass: ScanErrorClass | null;
  findingsInserted: number;
}

export async function runScan(scanId: string, url: string): Promise<RunScanResult> {
  // DIAG: per-step logging to pinpoint hang location. Remove once stable.
  const t0 = Date.now();
  const step = (name: string) =>
    console.log(`[scan ${scanId.slice(0, 8)}] +${Date.now() - t0}ms ${name}`);
  step("enter runScan");
  return withSpan("scan.run", async (span) => {
    span.setAttribute("scan_id", scanId);

    // 1. Lifecycle start.
    step("set status=running");
    await db
      .update(scans)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(scans.id, scanId));
    step("audit-log scan_started");
    await writeAuditEntry({ action: "scan_started", targetType: "scan", targetId: scanId });

    // 2. Wipe any prior findings for idempotent retry.
    step("wipe prior findings");
    await db.delete(scanFindings).where(eq(scanFindings.scanId, scanId));

    step("import playwright");
    let chromium;
    try {
      chromium = (await import("playwright")).chromium;
    } catch (err) {
      return finalizeFailed(scanId, "scanner_error", `playwright not available: ${String(err)}`);
    }

    step("launch chromium");
    const browser = await chromium.launch({ headless: true }).catch((err) => {
      captureException(err, { scope: "scan.runner.launch" });
      return null;
    });
    if (!browser) {
      return finalizeFailed(scanId, "scanner_error", "browser launch failed");
    }
    step("chromium launched");

    try {
      // ---- Desktop pass ----
      let desktopHtml = "";
      let desktopUrl = url;
      let domSignals: DomSignals | null = null;
      let desktopBlocker: ScanErrorClass | null = null;
      step("desktop newContext");
      const desktopContext = await browser.newContext({
        viewport: DESKTOP_VIEWPORT,
        ignoreHTTPSErrors: true,
        bypassCSP: true,
      });
      step("desktop newPage");
      const desktopPage = await desktopContext.newPage();
      try {
        step("desktop goto");
        const response = await desktopPage.goto(url, {
          timeout: NAVIGATION_TIMEOUT_MS,
          waitUntil: "domcontentloaded",
        });
        if (!response) {
          return finalizeFailed(scanId, "unreachable", "no response from navigation");
        }
        if (response.status() >= 400 && response.status() < 600) {
          if (response.status() === 401 || response.status() === 403) {
            desktopBlocker = "login_wall";
          } else {
            return finalizeFailed(scanId, "unreachable", `http ${response.status()}`);
          }
        }
        step("desktop content()");
        desktopHtml = await desktopPage.content();
        desktopUrl = desktopPage.url();
        step(`desktop captured html=${desktopHtml.length}b`);
      } catch (err) {
        return finalizeFailed(scanId, "unreachable", String(err));
      } finally {
        step("desktop close page");
        await desktopPage.close().catch(() => {});
      }

      step("extractDomSignals");
      domSignals = extractDomSignals(desktopHtml, desktopUrl);
      step("dom signals extracted");

      if (!desktopBlocker) {
        if (detectCaptcha(desktopHtml)) desktopBlocker = "captcha_blocked";
        else if (detectLoginWall(desktopHtml)) desktopBlocker = "login_wall";
      }

      step("lighthouse desktop (bypassed)");
      let lhDesktop: LighthouseResult | null = null;
      let lhMobile: LighthouseResult | null = null;
      try {
        lhDesktop = await runLighthouse(browser, desktopUrl, "desktop");
      } catch (err) {
        captureException(err, { scope: "scan.runner.lighthouse.desktop" });
      }

      step("mobile newContext");
      const mobileContext = await browser.newContext({
        viewport: MOBILE_VIEWPORT,
        userAgent: MOBILE_USER_AGENT,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        ignoreHTTPSErrors: true,
      });
      step("mobile newPage");
      const mobilePage = await mobileContext.newPage();
      try {
        step("mobile goto");
        await mobilePage.goto(desktopUrl, {
          timeout: NAVIGATION_TIMEOUT_MS,
          waitUntil: "domcontentloaded",
        });
        step("mobile navigated");
        try {
          lhMobile = await runLighthouse(browser, desktopUrl, "mobile");
        } catch (err) {
          captureException(err, { scope: "scan.runner.lighthouse.mobile" });
        }
      } catch {
        // Mobile failure is non-fatal — desktop signals are sufficient.
      } finally {
        step("mobile close page");
        await mobilePage.close().catch(() => {});
        step("mobile close context");
        await mobileContext.close().catch(() => {});
        step("desktop close context");
        await desktopContext.close().catch(() => {});
        step("contexts closed");
      }

      // ---- Non-hotel guard ----
      const hotelLike = looksLikeHotel(domSignals);
      const errorClass: ScanErrorClass | null = desktopBlocker
        ? desktopBlocker
        : hotelLike
          ? null
          : "non_hotel";

      // ---- Finding mapping ----
      const rows: FindingRow[] = [
        ...domToFindings(domSignals),
        ...vendorFingerprintFindings(domSignals),
      ];
      if (lhDesktop) rows.push(...lighthouseToFindings(lhDesktop, "desktop"));
      if (lhMobile) rows.push(...lighthouseToFindings(lhMobile, "mobile"));

      // Always inject the canonical-URL observation so the result page can
      // reflect what was scanned even when other signals are sparse.
      rows.push({
        field: "scanned_url",
        valueJson: desktopUrl,
        evidence: { source: "navigation" },
        confidence: "high",
      });

      if (errorClass === "non_hotel") {
        rows.push({
          field: "guidance_non_hotel",
          valueJson: true,
          evidence: { reason: "no hotel schema, no booking signals, no hospitality keywords" },
          confidence: "medium",
        });
      }
      if (desktopBlocker === "captcha_blocked" || desktopBlocker === "login_wall") {
        rows.push({
          field: `guidance_${desktopBlocker}`,
          valueJson: true,
          evidence: { source: "page_heuristic" },
          confidence: "high",
        });
      }

      step(`insert findings n=${rows.length}`);
      if (rows.length > 0) {
        await db.insert(scanFindings).values(
          rows.map((r) => ({
            scanId,
            field: r.field,
            valueJson: r.valueJson,
            evidence: r.evidence,
            confidence: r.confidence,
          })),
        );
      }

      const status: "succeeded" | "blocked" =
        desktopBlocker ? "blocked" : "succeeded";

      const freshnessExpiresAt = new Date(
        Date.now() + FRESHNESS_DAYS * 24 * 60 * 60 * 1000,
      );
      await db
        .update(scans)
        .set({
          status,
          errorClass,
          finishedAt: new Date(),
          freshnessExpiresAt,
          fingerprintSummary: buildSummary(domSignals, lhDesktop, lhMobile),
        })
        .where(eq(scans.id, scanId));
      await writeAuditEntry({
        action: "scan_completed",
        targetType: "scan",
        targetId: scanId,
        metadata: { status, error_class: errorClass },
      });

      step(`runScan returning status=${status}`);
      return { status, errorClass, findingsInserted: rows.length };
    } finally {
      step("browser.close()");
      await browser.close().catch(() => {});
      step("browser closed");
    }
  });
}

/* ----------------------------- helpers ----------------------------- */

async function finalizeFailed(
  scanId: string,
  errorClass: ScanErrorClass,
  detail: string,
): Promise<RunScanResult> {
  await db
    .update(scans)
    .set({
      status: "failed",
      errorClass,
      finishedAt: new Date(),
    })
    .where(eq(scans.id, scanId));
  await writeAuditEntry({
    action: "scan_failed",
    targetType: "scan",
    targetId: scanId,
    metadata: { error_class: errorClass, detail },
  });
  return { status: "failed", errorClass, findingsInserted: 0 };
}

function detectCaptcha(html: string): boolean {
  return (
    /recaptcha|hcaptcha|cf-challenge|cloudflare.+(challenge|just a moment)/i.test(html) ||
    /<title[^>]*>(?:[^<]*?attention[^<]*?required|just a moment)/i.test(html)
  );
}

function detectLoginWall(html: string): boolean {
  return (
    /<input[^>]+type=["']password["']/i.test(html) &&
    /<form[\s\S]{0,400}<input[^>]+type=["']password["']/i.test(html)
  );
}

function buildSummary(
  dom: DomSignals,
  lhDesktop: LighthouseResult | null,
  lhMobile: LighthouseResult | null,
): Record<string, unknown> {
  return {
    schema_hotel_present: dom.schemaHotelPresent,
    faq_present: dom.faqHeuristicMatched,
    whatsapp_visible: dom.whatsappLinkCount > 0,
    hreflang_count: dom.hreflangLanguages.length,
    booking_external: dom.bookingButtonExternalDomain,
    lighthouse_desktop_performance: lhDesktop?.performance ?? null,
    lighthouse_mobile_performance: lhMobile?.performance ?? null,
    lighthouse_mobile_lcp_ms: lhMobile?.lcpMs ?? null,
  };
}
