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

let _resolvedProjectId: string | null = null;

/**
 * Resolve the Deepgram project ID. Honors the `DEEPGRAM_PROJECT_ID` env var
 * when set; otherwise looks the project up via the management API on first
 * call and caches the result for the lifetime of the process.
 *
 * This avoids forcing users to manually copy a project ID from the Deepgram
 * dashboard when their account has a single project (the common case).
 */
async function getProjectId(): Promise<string> {
  if (process.env.DEEPGRAM_PROJECT_ID) return process.env.DEEPGRAM_PROJECT_ID;
  if (_resolvedProjectId) return _resolvedProjectId;
  const client = getClient();
  const { result, error } = await client.manage.getProjects();
  if (error) {
    throw new Error(`Deepgram project lookup failed: ${error.message}`);
  }
  const projects = result?.projects ?? [];
  if (projects.length === 0) {
    throw new Error("Deepgram account has no projects — create one or set DEEPGRAM_PROJECT_ID.");
  }
  const firstId = projects[0]?.project_id;
  if (!firstId) {
    throw new Error("Deepgram project lookup returned no project_id.");
  }
  _resolvedProjectId = firstId;
  return firstId;
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
  const projectKey = await getProjectId();
  const { result, error } = await client.manage.createProjectKey(projectKey, {
    comment: `audit-voice ${projectId}`,
    scopes: ["usage:write"],
    time_to_live_in_seconds: 60,
    tags: [`project:${projectId}`, "keep_audio:false"],
  });
  if (error) {
    // Common cause: the configured DEEPGRAM_API_KEY lacks `keys:write` scope.
    // Re-issue a key from the Deepgram console with "Member" or "Admin" role
    // so it can mint short-lived child keys for the browser.
    const lower = error.message.toLowerCase();
    if (lower.includes("scope") || lower.includes("permission")) {
      throw new Error(
        "Deepgram key cannot mint child keys — set DEEPGRAM_API_KEY to a key with `keys:write` scope (Member/Admin role).",
      );
    }
    throw new Error(`Deepgram key issue failed: ${error.message}`);
  }
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
