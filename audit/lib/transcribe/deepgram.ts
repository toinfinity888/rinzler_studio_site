import "server-only";

/**
 * Deepgram session-token issuance (T026 — FR-013).
 *
 * The browser opens a WebSocket directly to Deepgram's EU endpoint (no audio
 * traverses our server). To avoid embedding the long-lived API key client-side
 * we use Deepgram's short-lived "scope" tokens, which:
 *  - expire in ≤ 60 seconds,
 *  - are restricted to the `usage:write` scope (streaming only),
 *  - cannot be used to query the dashboard or pull existing transcripts,
 *  - are issued with `keep_audio=false` so Deepgram discards the audio buffer.
 *
 * The token-issuance route (`app/api/transcribe/session/route.ts`) is gated
 * on a valid project token; this module is the underlying mint helper.
 */

import { createClient } from "@deepgram/sdk";

export interface DeepgramSession {
  apiKey: string;
  expiresAtMs: number;
  region: string;
  /** Streaming options to pass into the browser-side WebSocket open call. */
  streamingOptions: {
    encoding: "linear16" | "opus";
    sample_rate?: number;
    language: string;
    model: string;
    keep_audio: false;
    interim_results: boolean;
  };
}

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (_client) return _client;
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    throw new Error("DEEPGRAM_API_KEY not set — voice transcription unavailable.");
  }
  _client = createClient(key);
  return _client;
}

/**
 * Issue a 60-second project-scoped session token.
 *
 * @param projectId Used to set the audit attribution tag on the temp key.
 * @param language ISO-639-1 ("fr" / "en").
 */
export async function issueDeepgramSession(
  projectId: string,
  language: string,
): Promise<DeepgramSession> {
  const client = getClient();
  // Deepgram SDK v3 exposes `manage.createProjectKey`. We create a single-use
  // key with `usage:write` scope and a TTL of 60 seconds.
  const projectKey = process.env.DEEPGRAM_PROJECT_ID;
  if (!projectKey) {
    throw new Error("DEEPGRAM_PROJECT_ID not set");
  }
  const { result, error } = await client.manage.createProjectKey(projectKey, {
    comment: `audit-voice ${projectId}`,
    scopes: ["usage:write"],
    time_to_live_in_seconds: 60,
    tags: [`project:${projectId}`, "keep_audio:false"],
  });
  if (error) throw new Error(`Deepgram key issue failed: ${error.message}`);
  return {
    apiKey: result.key,
    expiresAtMs: Date.now() + 60_000,
    region: process.env.DEEPGRAM_REGION ?? "eu",
    streamingOptions: {
      encoding: "linear16",
      sample_rate: 16_000,
      language,
      model: "nova-3-general",
      keep_audio: false,
      interim_results: true,
    },
  };
}
