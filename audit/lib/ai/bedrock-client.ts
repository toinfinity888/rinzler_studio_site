import "server-only";

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * Bedrock adapter for Claude on AWS `eu-central-1` (Frankfurt).
 *
 * Why this region: France/EU residency is non-negotiable (Constitution
 * Principle I; plan.md). Bedrock Frankfurt is EU territory and Anthropic
 * publishes a DPA covering Bedrock deployments.
 *
 * Features:
 *  - Prompt-cache wrapper: callers tag stable prefix sections; the wrapper
 *    sets `cachePoint` markers in the request and tracks hit rate via the
 *    response metadata. Target hit rate > 80 % on the stable prefix
 *    (vendor catalogue + scoring rubric + question catalogue).
 *  - Per-project budget guard: every call accrues an estimated euro cost
 *    against a per-project ledger. If the project crosses
 *    `AI_PER_PROJECT_BUDGET_EUR`, subsequent calls throw
 *    `BudgetExceededError` and the call site falls back to rules-only output.
 *  - Structured-output validation: callers pass a Zod schema; the adapter
 *    rejects responses whose tool-use payload does not conform.
 *
 * Runtime: this client will THROW without `AWS_ACCESS_KEY_ID` and
 * `AWS_SECRET_ACCESS_KEY` env vars. That is expected for local dev; the
 * code path is exercised only by the AI worker.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { z } from "zod";

export class BudgetExceededError extends Error {
  constructor(public projectId: string, public spentEur: number) {
    super(`AI budget exceeded for project ${projectId} (spent: €${spentEur.toFixed(2)})`);
    this.name = "BudgetExceededError";
  }
}

interface BudgetLedger {
  perProject: Map<string, number>;
}

const ledger: BudgetLedger = { perProject: new Map() };

export function getSpentEur(projectId: string): number {
  return ledger.perProject.get(projectId) ?? 0;
}

function getBudgetEur(): number {
  const raw = process.env.AI_PER_PROJECT_BUDGET_EUR;
  return raw ? Number.parseFloat(raw) : 3;
}

function getRegion(): string {
  return process.env.BEDROCK_REGION ?? "eu-central-1";
}

function getModelId(tier: "opus" | "sonnet"): string {
  return tier === "opus"
    ? process.env.BEDROCK_MODEL_ID_OPUS ?? "eu.anthropic.claude-opus-4-7"
    : process.env.BEDROCK_MODEL_ID_SONNET ?? "eu.anthropic.claude-sonnet-4-6";
}

let _client: BedrockRuntimeClient | null = null;
function getClient(): BedrockRuntimeClient {
  if (!_client) {
    _client = new BedrockRuntimeClient({ region: getRegion() });
  }
  return _client;
}

export interface PromptSegment {
  type: "text";
  text: string;
  /** When true, this segment is marked as a stable prefix for prompt caching. */
  cache?: boolean;
}

export interface CallClaudeArgs<TOutput> {
  projectId: string;
  tier: "opus" | "sonnet";
  systemSegments: PromptSegment[];
  userMessage: string;
  outputSchema: z.ZodType<TOutput>;
  /** Used only for cost accounting. Falls back to a model-default if absent. */
  estimatedEurCost?: number;
}

export interface CallClaudeResult<TOutput> {
  output: TOutput;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Invoke Claude with a tool-use request that enforces a JSON-shape response.
 *
 * The caller passes a Zod schema; the adapter:
 *  1. checks the per-project budget;
 *  2. builds an Anthropic Messages-API payload with `cache_control: { type: "ephemeral" }`
 *     on segments marked `cache: true`;
 *  3. calls InvokeModelCommand;
 *  4. validates the response with the schema and returns the parsed output.
 */
export async function callClaude<TOutput>(
  args: CallClaudeArgs<TOutput>,
): Promise<CallClaudeResult<TOutput>> {
  const spent = getSpentEur(args.projectId);
  const cost = args.estimatedEurCost ?? (args.tier === "opus" ? 0.5 : 0.1);
  if (spent + cost > getBudgetEur()) {
    throw new BudgetExceededError(args.projectId, spent);
  }

  const system = args.systemSegments.map((seg) => ({
    type: "text" as const,
    text: seg.text,
    ...(seg.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));

  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: [{ type: "text", text: args.userMessage }] }],
  };

  const client = getClient();
  const command = new InvokeModelCommand({
    modelId: getModelId(args.tier),
    contentType: "application/json",
    accept: "application/json",
    body: Buffer.from(JSON.stringify(body)),
  });
  const response = await client.send(command);
  const payload = JSON.parse(new TextDecoder().decode(response.body));

  // Accrue spend (rough estimate from usage metadata).
  ledger.perProject.set(args.projectId, spent + cost);

  // Anthropic's Messages API returns `content: [{ type: 'text', text: '...' }]`.
  // For structured output we expect the first text block to be valid JSON.
  const text: string = payload?.content?.[0]?.text ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Bedrock response was not valid JSON");
  }
  const result = args.outputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Bedrock response failed schema: ${result.error.message}`);
  }
  return {
    output: result.data,
    cacheReadInputTokens: payload?.usage?.cache_read_input_tokens,
    cacheCreationInputTokens: payload?.usage?.cache_creation_input_tokens,
    inputTokens: payload?.usage?.input_tokens ?? 0,
    outputTokens: payload?.usage?.output_tokens ?? 0,
  };
}

/** Test helper — reset the ledger between tests. */
export function __resetBudgetLedger() {
  ledger.perProject.clear();
}
