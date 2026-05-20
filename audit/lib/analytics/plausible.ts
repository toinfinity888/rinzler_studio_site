import "server-only";
import crypto from "node:crypto";

import type { EventName } from "./events";

/**
 * T157 — Server-side Plausible event emission, typed against the canonical
 * `EventName` union in `./events`. Both client and server emit paths now
 * share the same name catalog, so renaming or adding an event happens in
 * exactly one file.
 *
 * Best-effort: fire-and-forget, swallows errors. Never blocks the
 * critical path (autosave/submit/export). The client-side script in
 * `(client)/layout.tsx` handles automatic page-view tracking.
 *
 * Constitution v1.1.1: data-domain locked to `audit.rinzlerstudio.com`.
 */

const DOMAIN = process.env.PLAUSIBLE_DOMAIN ?? "audit.rinzlerstudio.com";
const ENDPOINT = "https://plausible.io/api/event";

/**
 * @deprecated re-export of `EventName` kept under the historical name so
 * callers from feature 001 (which used `PlausibleEvent`) keep compiling.
 * New code should import `EventName` from `./events` directly.
 */
export type PlausibleEvent = EventName;

export function track(
  name: EventName,
  props?: Record<string, string | number | boolean>,
): void {
  // Hash any project_id passed in to avoid leaking the plaintext token surface.
  const safeProps = props
    ? Object.fromEntries(
        Object.entries(props).map(([k, v]) =>
          k === "project_id" && typeof v === "string"
            ? [k, hashShort(v)]
            : [k, String(v)],
        ),
      )
    : undefined;

  const body = JSON.stringify({
    name,
    url: `https://${DOMAIN}/`,
    domain: DOMAIN,
    props: safeProps,
  });

  // Fire-and-forget; do NOT await.
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "RinzlerAuditServer/1.0",
    },
    body,
    // 1.5s timeout via AbortSignal to avoid stalling the parent request.
    signal: AbortSignal.timeout(1500),
  }).catch(() => {
    /* swallow */
  });
}

function hashShort(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}
