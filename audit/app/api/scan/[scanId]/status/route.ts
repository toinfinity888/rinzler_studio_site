/**
 * GET /api/scan/[scanId]/status — public polling endpoint (T040).
 *
 * Per public-server-actions.md. The caller must already know the (unguessable)
 * scanId; no listing endpoint exists.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { scans } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ scanId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
): Promise<NextResponse> {
  const { scanId } = await params;
  if (!scanId || typeof scanId !== "string") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const rows = await db.select().from(scans).where(eq(scans.id, scanId)).limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const row = rows[0]!;
  return NextResponse.json(
    {
      scan_id: row.id,
      status: row.status,
      started_at: row.startedAt?.toISOString() ?? null,
      finished_at: row.finishedAt?.toISOString() ?? null,
      error_class: row.errorClass ?? null,
      freshness_expires_at: row.freshnessExpiresAt?.toISOString() ?? null,
      progress_hint: progressHint(row.status),
    },
    { status: 200 },
  );
}

function progressHint(
  status: typeof scans.$inferSelect.status,
): number {
  switch (status) {
    case "queued":
      return 0.1;
    case "running":
      return 0.5;
    case "succeeded":
    case "failed":
    case "blocked":
      return 1;
    default:
      return 0;
  }
}
