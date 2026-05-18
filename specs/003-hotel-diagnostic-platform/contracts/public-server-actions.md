# Contract: Public (Anonymous) Server Actions & Endpoints

These surfaces are reachable without authentication. They power the free-scan flow (User Story 1).

Rate limited per IP (R11). All responses are JSON unless noted.

---

## `POST /api/scan/start` — start a free scan

**Auth**: none. Per-IP rate limit: 5 / hour. Global concurrency cap on scan worker.

**Request body**:
```json
{
  "url": "https://example-hotel.com"
}
```

**Behavior**:
1. Normalize URL (lowercase host, strip `www.`, strip trailing slash).
2. Look up a recent `scans` row with `canonical_url = $1` and `freshness_expires_at > now()`. If found and `status = 'succeeded'`, return its `id` immediately (no re-scan).
3. Otherwise, enqueue a `scan` job (see `worker-jobs.md`). Persist a `scans` row with `status = 'queued'` and a synthetic standalone `projects` row with `tier = 'free_scan'`, `hotel_id = NULL`, `purge_after = now() + interval '90 days'`.
4. Return the `scan_id` and the `project_id` for the standalone free-scan project.

**Response 200**:
```json
{
  "scan_id": "01J...",
  "project_id": "01J...",
  "status": "queued" | "succeeded",
  "reused_cached": true | false,
  "estimated_seconds": 45
}
```

**Response 400**: invalid URL, non-http(s) scheme, IP literal, internal host.

**Response 429**: rate limit hit.

---

## `GET /api/scan/:scanId/status` — poll a scan

**Auth**: none. Caller MUST know the `scanId` (256-bit, unguessable).

**Response 200**:
```json
{
  "scan_id": "01J...",
  "status": "queued" | "running" | "succeeded" | "failed" | "blocked",
  "started_at": "...",
  "finished_at": "...",
  "error_class": null | "unreachable" | "captcha_blocked" | "login_wall" | "non_hotel" | "scanner_error",
  "freshness_expires_at": "...",
  "progress_hint": 0..1
}
```

**Response 404**: unknown `scanId` or expired.

---

## Server Action: `getPublicScanResult(scanId)` — fetch the rendered free-scan result

**Used by**: `app/(public)/scan/[scanId]/page.tsx`.

**Returns**: a `PublicScanResult` shape:

```ts
{
  scanId: string;
  projectId: string;
  url: string;
  observations: Observation[];          // plain-language findings (FR-004)
  opportunity_map: QuickWin[];          // FR-007
  detected_vendors: DetectedVendor[];   // booking engine, PMS hints, etc.
  freshness_expires_at: string;
  upgrade_cta: {
    estimated_minutes: number;          // honesty estimate, US 1 acceptance 3
    next_tier: 'mini' | 'full';
    differences_from_free: string[];    // FR-081
  }
}
```

`Observation` shape:
```ts
{
  category: 'performance' | 'mobile' | 'ai_search' | 'booking_path' | 'communication' | 'tech_stack';
  headline: string;            // plain-language, e.g. "Your booking button redirects to an external domain"
  detail: string;              // 1–2 sentence explanation
  severity: 'info' | 'opportunity' | 'risk';
  evidence_hint?: string;      // e.g. "Mobile LCP measured at 4.2 s on simulated 4G"
}
```

---

## Server Action: `optInToEmail(scanId, email, consent)` — optional lead capture (Clarification Q2 / FR-009)

**Used by**: `app/(public)/scan/[scanId]/page.tsx`.

**Behavior**:
1. Require `consent === true` (explicit checkbox).
2. Validate `email` shape.
3. Attach the email to the standalone free-scan project (`projects.contact_email`).
4. Emit `scan_email_opt_in` Plausible event.
5. Schedule a one-shot follow-up email job (queued in BullMQ).
6. MUST NOT degrade or partially hide the scan output — declining is identical to not asking (FR-009).

**Returns**: `{ ok: true }`. Errors are silent UX-side (don't block the visitor's view).

---

## `GET /scan/:scanId` (public page route)

Renders the free-scan result. SEO: indexable for share-back-into-Google but each individual scan ID is a long, unguessable opaque string; no listing page enumerates them.

The page itself is a public marketing surface and carries:
- `<title>`, `description`, OG, Twitter tags appropriate for sharing the scan.
- Structured data: `WebApplication` + `Service`.
- Plausible event: `scan_completed_viewed`.

The page DOES NOT expose the `project_id` in the URL — only the `scan_id`.

---

## Anti-abuse posture (R11)

| Layer | Mechanism |
|---|---|
| Per-IP | 5 scans/hour token bucket via `audit/lib/auth/rate-limit.ts` extended for anonymous origin. |
| Per-URL | Cache reuse short-circuits within `freshness_expires_at`. |
| Global | BullMQ `scan` queue limited to 4 concurrent workers per instance. |
| Browser | Playwright contexts disposed after each scan; no cookie/localStorage carryover. |
| Input | URL normalization rejects RFC 1918, localhost, link-local, file://, javascript:, data:. |

No CAPTCHA in V1; reconsider once abuse is observed.
