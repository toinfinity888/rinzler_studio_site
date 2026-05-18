import type { ScoreEntry, AnswerMap } from "./types";
import { bandForValue } from "./types";
import { SCORE_NAMES, type ScoreName } from "@/db/schema";

/**
 * V1 scoring registry. Phase 6 (US4) replaces these stubs with real
 * heuristics in lib/scoring/<name>.ts. The interface (Scorer) is stable so
 * future AI-driven scorers swap in without UI changes (FR-033, FR-046).
 */
const STUB_VALUE = 0;

const stubScore = (name: ScoreName): ScoreEntry => ({
  name,
  value: STUB_VALUE,
  band: bandForValue(STUB_VALUE),
  basis: [],
});

export function runAllScores(_answers: AnswerMap): ScoreEntry[] {
  // Phase 6 will replace each entry with a real scorer call.
  return SCORE_NAMES.map(stubScore);
}

export type { ScoreEntry } from "./types";
