/**
 * Pure freshness helpers, deliberately split out of `provenance.ts` so
 * client components can import them. `provenance.ts` is `server-only`
 * because it touches the DB; anything that doesn't is fair game here.
 */

export const DEFAULT_FRESHNESS_DAYS = 180;

export interface FreshnessStatus {
  isStale: boolean;
  ageDays: number | null;
}

export function freshnessStatus(
  lastVerifiedAt: Date | null,
  windowDays: number = DEFAULT_FRESHNESS_DAYS,
): FreshnessStatus {
  if (!lastVerifiedAt) return { isStale: true, ageDays: null };
  const ms = Date.now() - lastVerifiedAt.getTime();
  const ageDays = ms / (1000 * 60 * 60 * 24);
  return { isStale: ageDays > windowDays, ageDays };
}