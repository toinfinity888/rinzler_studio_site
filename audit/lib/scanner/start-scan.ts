import "server-only";

/**
 * `startScan(url, ip)` — shared by the public POST endpoint (T039) and any
 * future programmatic caller.
 *
 * Behavior (per public-server-actions.md):
 *  1. Validate + canonicalize URL.
 *  2. Per-IP rate limit (5 / hour token bucket).
 *  3. Cache-reuse: if a succeeded `scans` row exists for the canonical URL
 *     within freshness window, return its id.
 *  4. Otherwise create a standalone `projects` row (tier=`free_scan`) and a
 *     fresh `scans` row, then enqueue `scan.run`.
 *  5. Return the scan + project ids.
 */

import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects, scans } from "@/db/schema";
import {
  consumeRateLimit,
  FREE_SCAN_RATE_LIMIT,
} from "@/lib/auth/rate-limit";
import { guardUrl, type UrlGuardErr } from "./url-guard";
import { enqueueScanRun } from "@/workers/scan.worker";

const FREE_SCAN_PURGE_DAYS = 90;

export type StartScanResult =
  | {
      ok: true;
      scanId: string;
      projectId: string;
      status: "queued" | "succeeded";
      reusedCached: boolean;
      estimatedSeconds: number;
    }
  | {
      ok: false;
      reason: UrlGuardErr["reason"] | "rate_limited";
      resetMs?: number;
    };

export interface StartScanInput {
  url: string;
  ip: string;
}

export async function startScan(input: StartScanInput): Promise<StartScanResult> {
  const guard = guardUrl(input.url);
  if (!guard.ok) {
    return { ok: false, reason: guard.reason };
  }

  const limit = consumeRateLimit(
    `scan:${input.ip}`,
    FREE_SCAN_RATE_LIMIT.capacity,
    FREE_SCAN_RATE_LIMIT.windowMs,
  );
  if (!limit.ok) {
    return { ok: false, reason: "rate_limited", resetMs: limit.resetMs };
  }

  // Cache-reuse.
  const now = new Date();
  const cached = await db
    .select()
    .from(scans)
    .where(
      and(
        eq(scans.canonicalUrl, guard.canonical),
        eq(scans.status, "succeeded"),
        gt(scans.freshnessExpiresAt, now),
      ),
    )
    .orderBy(desc(scans.finishedAt))
    .limit(1);

  if (cached.length > 0) {
    const row = cached[0]!;
    return {
      ok: true,
      scanId: row.id,
      projectId: row.projectId ?? row.id,
      status: "succeeded",
      reusedCached: true,
      estimatedSeconds: 0,
    };
  }

  // Create the free-scan project + scan + enqueue.
  const purgeAfter = new Date(
    now.getTime() + FREE_SCAN_PURGE_DAYS * 24 * 60 * 60 * 1000,
  );

  const [project] = await db
    .insert(projects)
    .values({
      label: `Free scan — ${guard.canonical}`,
      tier: "free_scan",
      status: "draft",
      priority: "low",
      purgeAfter,
    })
    .returning({ id: projects.id });

  if (!project) {
    return { ok: false, reason: "invalid_url" };
  }

  const [scan] = await db
    .insert(scans)
    .values({
      url: guard.normalized,
      canonicalUrl: guard.canonical,
      projectId: project.id,
      status: "queued",
    })
    .returning({ id: scans.id });

  if (!scan) {
    return { ok: false, reason: "invalid_url" };
  }

  await enqueueScanRun({
    scan_id: scan.id,
    url: guard.normalized,
    canonical_url: guard.canonical,
    project_id: project.id,
  });

  return {
    ok: true,
    scanId: scan.id,
    projectId: project.id,
    status: "queued",
    reusedCached: false,
    estimatedSeconds: 45,
  };
}
