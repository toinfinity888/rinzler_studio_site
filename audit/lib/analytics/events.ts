/**
 * Plausible events module (T046).
 *
 * The Plausible script is cookie-free and EU-hosted; it exposes a global
 * `plausible(name, options)` function in the browser. This module provides
 * the canonical event names + a typed wrapper so call sites cannot drift.
 *
 * Free-scan flow events (US 1):
 *  - `scan_started` — fires on POST /api/scan/start success.
 *  - `scan_completed` — fires when worker finishes (server-side; mirrored
 *    here so the client can also emit when the page transitions out of
 *    "running" state).
 *  - `scan_email_opt_in` — fires on email submit.
 *  - `scan_completed_viewed` — fires when result page paints.
 */

export type ScanEventName =
  | "scan_started"
  | "scan_completed"
  | "scan_email_opt_in"
  | "scan_completed_viewed";

export type AuditEventName =
  | "audit_started"
  | "audit_section_progressed"
  | "audit_voice_used"
  | "audit_submitted";

export type ReportEventName =
  | "report_generated"
  | "report_published"
  | "report_exported"
  | "scenario_compared"
  | "recommendation_inspected";

export type EventName = ScanEventName | AuditEventName | ReportEventName;

export interface EventProps {
  [key: string]: string | number | boolean | null;
}

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: EventProps; callback?: () => void },
    ) => void;
  }
}

export function trackEvent(name: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  try {
    window.plausible(name, props ? { props } : undefined);
  } catch {
    // Plausible failures must never break the UX.
  }
}
