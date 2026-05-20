/**
 * Consultant workspace — shared types + constants.
 *
 * Lives in its own file (not in `override.ts`) because the action module is
 * `"use server"` — Next.js restricts those to async-function exports only
 * (constitution v1.2.0).
 */
import { SCENARIO_WEIGHT_ADJUSTMENTS, type ScenarioWeightAdjustment } from "@/db/schema";

export const SCENARIO_WEIGHT_ADJUSTMENT_VALUES = SCENARIO_WEIGHT_ADJUSTMENTS;
export type { ScenarioWeightAdjustment };

export interface ApplyConsultantOverrideInput {
  projectId: string;
  questionSlug: string;
  overrideValue: unknown;
  reason: string;
}

export interface ApplyConsultantOverrideResult {
  ok: true;
  overrideAnswerId: string;
  originalAnswerId: string | null;
  recomputeEnqueued: boolean;
}

export interface ApplyConsultantOverrideError {
  ok: false;
  error: { code: string; message: string };
}

export type ApplyConsultantOverrideOutcome =
  | ApplyConsultantOverrideResult
  | ApplyConsultantOverrideError;

export interface ScenarioWeightAdjustmentInput {
  adjustment: ScenarioWeightAdjustment;
  scenarioId?: string | null;
  recommendationId?: string | null;
  weightDelta?: number | null;
  reason?: string | null;
}

export interface AdjustScenarioWeightsInput {
  projectId: string;
  scenarioId: string | null;
  adjustments: ScenarioWeightAdjustmentInput[];
}

export interface AdjustScenarioWeightsResult {
  ok: true;
  insertedIds: string[];
  recomputeEnqueued: boolean;
}

export type AdjustScenarioWeightsOutcome =
  | AdjustScenarioWeightsResult
  | { ok: false; error: { code: string; message: string } };

export interface PublishConsultantReportResult {
  ok: true;
  snapshotId: string;
  status: "consultant_finalized";
}

export type PublishConsultantReportOutcome =
  | PublishConsultantReportResult
  | { ok: false; error: { code: string; message: string } };

/**
 * Marker prefix for the private internal note attached to an override.
 * The strip-check looks for the consultant override `reason` body in the
 * published snapshot — that text MUST NEVER appear in `rendered_json`.
 */
export const OVERRIDE_NOTE_PREFIX = "[override]";
export const SCENARIO_NOTE_PREFIX = "[scenario-weight]";
