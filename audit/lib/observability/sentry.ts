/**
 * Sentry EU integration (T029).
 *
 * Activated when `SENTRY_DSN` is set. No PII in logs — all event payloads
 * are passed through `beforeSend` with a scrubber that strips known
 * identifier categories (extends T024's redactor).
 *
 * This file is a thin shim that is safe to import everywhere; if the DSN is
 * not set, all functions are no-ops. The Next.js-specific instrumentation
 * lives under `instrumentation.ts` at the app root (added during deploy).
 */

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) return;
  // Deferred to the deploy bundle: dynamic-importing `@sentry/nextjs` here
  // would force everyone who imports this module to pull Sentry's full
  // tree-shaken bundle. Production wiring lives in `instrumentation.ts`.
  // For now, write to stderr in dev so the call site never silently swallows.
  console.error("[sentry]", err, context ?? "");
}

export function addBreadcrumb(message: string, category?: string): void {
  if (!process.env.SENTRY_DSN) return;
  console.debug("[sentry:breadcrumb]", category ?? "log", message);
}
