import "server-only";

/**
 * Per-IP rate limiter (T039 / public-server-actions.md anti-abuse posture).
 *
 * Strategy:
 *  - In-process token-bucket fallback (used in dev and tests). NOT safe for
 *    multi-process production: rate limits leak across replicas. The boot
 *    code switches to a Redis-backed limiter once REDIS_URL is reachable.
 *  - The Redis path is implemented via BullMQ's `RateLimiterRedis` from
 *    `bullmq`'s low-level queue rate-limiter shared with the scan worker.
 *
 * The public bucket is 5 requests / hour per IP (R11).
 */

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

const buckets = new Map<string, BucketState>();

export interface RateLimitDecision {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

export function consumeRateLimit(
  key: string,
  capacity: number,
  windowMs: number,
  cost = 1,
): RateLimitDecision {
  const now = Date.now();
  const state = buckets.get(key) ?? { tokens: capacity, lastRefillMs: now };
  const elapsed = now - state.lastRefillMs;
  const refill = (elapsed / windowMs) * capacity;
  state.tokens = Math.min(capacity, state.tokens + refill);
  state.lastRefillMs = now;
  if (state.tokens < cost) {
    buckets.set(key, state);
    return {
      ok: false,
      remaining: 0,
      resetMs: Math.ceil(((cost - state.tokens) / capacity) * windowMs),
    };
  }
  state.tokens -= cost;
  buckets.set(key, state);
  return {
    ok: true,
    remaining: Math.floor(state.tokens),
    resetMs: 0,
  };
}

export interface RateLimitConfig {
  capacity: number;
  windowMs: number;
}

/** Public free-scan limit (FR / public-server-actions.md). */
export const FREE_SCAN_RATE_LIMIT: RateLimitConfig = {
  capacity: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};
