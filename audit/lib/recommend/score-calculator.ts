/**
 * T069 — Score calculator (orchestrator for FR-036 / FR-037).
 *
 * Calls every per-dimension contribution function and produces the canonical
 * 9-row readiness score set. Pure; persistence is the caller's job.
 */
import type { ReadinessScoreResult, RecommendationContext } from "./types";

import {
  scoreWebsite,
  scoreAiSearch,
  scoreDirectBooking,
  scoreGuestCommunication,
  scoreAutomation,
  scoreToolStackCoherence,
  scoreDataIntegration,
  scoreCompliance,
  scoreOperationalWorkload,
} from "./rules/scoring-contributions";

export function computeReadinessScores(
  ctx: RecommendationContext,
): ReadinessScoreResult[] {
  return [
    scoreWebsite(ctx),
    scoreAiSearch(ctx),
    scoreDirectBooking(ctx),
    scoreGuestCommunication(ctx),
    scoreAutomation(ctx),
    scoreToolStackCoherence(ctx),
    scoreDataIntegration(ctx),
    scoreCompliance(ctx),
    scoreOperationalWorkload(ctx),
  ];
}
