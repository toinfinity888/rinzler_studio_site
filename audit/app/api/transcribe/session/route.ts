/**
 * T059 — `POST /api/transcribe/session`.
 *
 * Issues a short-lived (60s) Deepgram session token to the client so it can
 * open a WebSocket DIRECTLY to Deepgram (no audio passes through our
 * server — FR-013, R3). The session is gated on a valid tokenized client
 * path token (`projects.token_hash`).
 *
 * The response includes the streaming options the bridge needs to open the
 * WebSocket. The "raw" Deepgram key is bag-on-stage: the only reason it
 * exists is that we just minted it, scoped to streaming-only with
 * `time_to_live_in_seconds: 60` and `keep_audio:false` tag.
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { projects, hotels } from "@/db/schema";
import { hashToken, verifyToken } from "@/lib/tokens";
import { issueDeepgramSession } from "@/lib/transcribe/deepgram";

interface RequestBody {
  token?: string;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const token = body.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const candidateHash = hashToken(token);
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tokenHash, candidateHash))
    .limit(1);
  if (
    !project ||
    !project.tokenHash ||
    project.tokenRevokedAt ||
    project.status === "purged" ||
    !verifyToken(token, project.tokenHash)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (project.status !== "in_progress" && project.status !== "draft" && project.status !== "awaiting_client" && project.status !== "reopened") {
    return NextResponse.json({ error: "locked" }, { status: 409 });
  }

  let language = "fr";
  if (project.hotelId) {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, project.hotelId)).limit(1);
    if (hotel?.primaryLanguage) language = hotel.primaryLanguage;
  }

  try {
    const session = await issueDeepgramSession(project.id, language);
    return NextResponse.json({
      provider: "deepgram_eu",
      session_token: session.apiKey,
      websocket_url: "wss://api.deepgram.com/v1/listen",
      expires_at: new Date(session.expiresAtMs).toISOString(),
      fallback_provider: null,
      streaming_options: session.streamingOptions,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "deepgram_unavailable",
        detail: err instanceof Error ? err.message : "unknown",
        fallback_provider: "webspeech",
      },
      { status: 503 },
    );
  }
}
