/**
 * POST /api/scan/start — public, anonymous, per-IP rate-limited (T039).
 *
 * See `specs/003-hotel-diagnostic-platform/contracts/public-server-actions.md`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { startScan } from "@/lib/scanner/start-scan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.message },
      { status: 400 },
    );
  }

  const ip = extractIp(req);
  const result = await startScan({ url: parsed.data.url, ip });

  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Limite de scans atteinte. Réessayez plus tard.",
          reset_ms: result.resetMs ?? null,
        },
        {
          status: 429,
          headers: result.resetMs
            ? { "Retry-After": String(Math.ceil(result.resetMs / 1000)) }
            : undefined,
        },
      );
    }
    return NextResponse.json(
      {
        error: result.reason,
        message: messageFor(result.reason),
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      scan_id: result.scanId,
      project_id: result.projectId,
      status: result.status,
      reused_cached: result.reusedCached,
      estimated_seconds: result.estimatedSeconds,
    },
    { status: 200 },
  );
}

function extractIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  // Last-resort: NextRequest no longer exposes `ip` in 15.x, so fall back to a
  // synthetic "unknown" token. The rate limiter still treats this as a key.
  return "unknown";
}

function messageFor(reason: string): string {
  switch (reason) {
    case "invalid_url":
      return "Cette URL n'est pas valide.";
    case "bad_scheme":
      return "Seules les URLs http:// ou https:// sont acceptées.";
    case "ip_literal":
      return "Les adresses IP littérales ne sont pas acceptées.";
    case "internal_host":
      return "Cet hôte est interne ou privé et ne peut pas être scanné.";
    case "empty":
      return "L'URL est requise.";
    default:
      return "Requête invalide.";
  }
}
