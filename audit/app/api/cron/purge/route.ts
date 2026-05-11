import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { runPurgeSweep, isPurgeSweepDue } from "@/lib/purge/sweep";

/**
 * 36-month auto-purge sweep endpoint (FR-044b, R11).
 * Triggered by an o2switch cPanel cron entry daily at 03:15 Europe/Paris.
 * Idempotent: skips work if last sweep was within 24h, unless `?force=1`.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") ?? "";

  if (!expected || !timingSafeEqualString(provided, expected)) {
    // Generic 401 with no body — no signal to attackers.
    return new NextResponse(null, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  if (!force && !isPurgeSweepDue()) {
    return NextResponse.json({ purged: 0, skipped: true, reason: "not_due" });
  }

  const result = runPurgeSweep();
  return NextResponse.json(result);
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  try {
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}
