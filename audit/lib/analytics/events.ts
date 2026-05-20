/**
 * T157 — Canonical Plausible event catalog (T046 unified across the
 * client + server emit paths).
 *
 * Two emission helpers exist:
 *
 *   - `trackEvent(name, props)` — client-side, calls the global
 *     `window.plausible(...)` exposed by the cookie-free Plausible
 *     script loaded in `(client)/layout.tsx` and `(public)/layout.tsx`.
 *
 *   - `track(name, props)` (in `./plausible.ts`) — server-side, fires
 *     a POST to the Plausible HTTP API. Best-effort, fire-and-forget;
 *     hashes `project_id` to avoid leaking the plaintext token surface.
 *
 * Both helpers MUST use the `EventName` union below — that's what makes
 * this T157 instead of just T046. Adding a new event = adding it here
 * once, then both client and server paths get the name typed.
 *
 * Constitution v1.1.1: data-domain locked to `audit.rinzlerstudio.com`.
 */

/* ----------------------------- Event names ----------------------------- */

export type ScanEventName =
  | "scan_started"
  | "scan_completed"
  | "scan_email_opt_in"
  | "scan_completed_viewed";

export type AuditEventName =
  | "audit_started"
  | "audit_section_progressed"
  | "audit_section_completed"
  | "audit_voice_used"
  | "audit_submitted"
  | "audit_revoked_view";

export type ReportEventName =
  | "report_generated"
  | "report_published"
  | "report_exported"
  | "scenario_compared"
  | "recommendation_inspected"
  | "vendor_shortlist_clicked";

export type FundingEventName = "funding_brief_generated";

export type AdminEventName = "admin_export_json";

export type EventName =
  | ScanEventName
  | AuditEventName
  | ReportEventName
  | FundingEventName
  | AdminEventName;

/* ----------------------------- Props ----------------------------- */

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

/* ----------------------------- Client emit ----------------------------- */

/**
 * Browser-side event emission. Safe to call on the server (no-op) so
 * isomorphic call sites don't need to guard.
 */
export function trackEvent(name: EventName, props?: EventProps): void {
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;
  try {
    window.plausible(name, props ? { props } : undefined);
  } catch {
    // Plausible failures must never break the UX.
  }
}
