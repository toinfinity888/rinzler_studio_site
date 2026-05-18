import type { ScoreBand, ScoreName } from "@/db/schema";

export type AnswerMap = Map<string, unknown> | Record<string, unknown>;

export interface ScoreResult {
  value: number; // 0..100
  band: ScoreBand;
  basis: string[]; // field_ids that drove the score (FR-046 explainability hook)
}

export type Scorer = (answers: AnswerMap) => ScoreResult;

export interface ScoreEntry extends ScoreResult {
  name: ScoreName;
}

export function bandForValue(value: number): ScoreBand {
  if (value >= 67) return "high";
  if (value >= 34) return "medium";
  return "low";
}

export function getAnswer(answers: AnswerMap, id: string): unknown {
  return answers instanceof Map ? answers.get(id) : (answers as Record<string, unknown>)[id];
}
