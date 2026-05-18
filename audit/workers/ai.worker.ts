/**
 * T062 — `ai.worker.ts` (DEFERRED: the Claude tool-use call is gated on the
 * Bedrock model-access form approval).
 *
 * This module registers the BullMQ worker for the `ai` queue and provides
 * runtime-safe stubs for the documented jobs:
 *
 *  - `ai.extract_voice_structure` (worker-jobs.md): structures the
 *    transcript into { topics, channels, current_process, ... }.
 *
 *  - `ai.reason_project` (US3, T074): the heavy reasoning step.
 *
 * Until the Bedrock model-access form is approved, the handler does NOT
 * call Claude. It only:
 *   1. Validates the job payload shape.
 *   2. Logs the intent.
 *   3. Returns a no-op success (idempotent) so the queue does not retry.
 *
 * The handler MUST be runtime-safe at import time (no Bedrock client
 * instantiation, no schema validation against a non-existent prompt module).
 */
import { createWorker, type QueueName } from "./lib/queue";

export const AI_QUEUE: QueueName = "ai";

export interface AiExtractVoiceJob {
  voice_capture_id: string;
  transcript_post_edit: string;
  language: string;
  context: { question_slug: string; project_id: string };
}

export interface AiReasonProjectJob {
  project_id: string;
  trigger: "audit_submitted" | "consultant_recompute" | "override_applied";
  scope: "full" | "partial";
  partial_recommendations?: string[];
}

type AiJobPayload =
  | (AiExtractVoiceJob & { __kind?: "voice" })
  | (AiReasonProjectJob & { __kind?: "reason" });

export function registerAiWorker() {
  return createWorker<AiJobPayload>(AI_QUEUE, async (job) => {
    switch (job.name) {
      case "ai.extract_voice_structure": {
        const data = job.data as AiExtractVoiceJob;
        console.log(
          `[ai] extract_voice_structure (DEFERRED) voice_capture=${data?.voice_capture_id} project=${data?.context?.project_id ?? "?"}`,
        );
        // TODO: enable when Bedrock use-case form approves.
        // The intended call is:
        //   const ai = await import("@/lib/ai/bedrock-client");
        //   const out = await ai.extractFromTranscript({ transcript, language });
        //   await persistStructuredExtraction(voice_capture_id, out);
        return { ok: true, deferred: true };
      }
      case "ai.reason_project": {
        const data = job.data as AiReasonProjectJob;
        console.log(
          `[ai] reason_project (DEFERRED) project=${data?.project_id} trigger=${data?.trigger}`,
        );
        // TODO: enable when Bedrock use-case form approves + US3 lands (T074).
        return { ok: true, deferred: true };
      }
      case "ai.summarize_pattern":
        console.log(`[ai] summarize_pattern (DEFERRED)`);
        return { ok: true, deferred: true };
      default:
        console.warn(`[ai] unknown job name: ${job.name}`);
        return { ok: false, reason: "unknown_job" };
    }
  });
}
