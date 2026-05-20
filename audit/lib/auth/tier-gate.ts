/**
 * T123 — Tier-enforcement guard (FR-080 / FR-081 / FR-082).
 *
 * A pure decision helper: given a project's tier and the artefact a caller
 * wants to access, returns either `{ allowed: true }` or `{ allowed: false,
 * required_tier, upgrade_url }`. The guard does NOT throw — server actions
 * pattern-match on the result and return their own typed rejection so the
 * client surface stays in control of UX.
 *
 * The catalog of which artefacts each tier produces lives in
 * `lib/tier/differences.ts` (single source of truth). This file just
 * combines that catalog with FR-082 messaging ("no tier exposes another
 * tier's output").
 */
import "server-only";

import type { ProjectTier } from "@/db/schema/identity";

import {
  type TierArtefact,
  minimumTierFor,
  tierIncludes,
} from "@/lib/tier/differences";

export type TierGateResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "tier_insufficient";
      current_tier: ProjectTier;
      required_tier: ProjectTier;
      artefact: TierArtefact;
      upgrade_url: string;
    };

export interface CheckTierAccessInput {
  current_tier: ProjectTier;
  artefact: TierArtefact;
}

export function checkTierAccess(input: CheckTierAccessInput): TierGateResult {
  if (tierIncludes(input.current_tier, input.artefact)) {
    return { allowed: true };
  }
  const required = minimumTierFor(input.artefact);
  if (!required) {
    // No tier produces this artefact — fail closed; the catalog is the
    // authority and a missing entry is a configuration error, not a
    // hotelier-visible upgrade prompt.
    return {
      allowed: false,
      reason: "tier_insufficient",
      current_tier: input.current_tier,
      required_tier: "implementation",
      artefact: input.artefact,
      upgrade_url: "/upgrade",
    };
  }
  return {
    allowed: false,
    reason: "tier_insufficient",
    current_tier: input.current_tier,
    required_tier: required,
    artefact: input.artefact,
    upgrade_url: `/upgrade?from=${input.current_tier}&to=${required}`,
  };
}

/**
 * Convenience wrapper for the common pattern in a server action:
 *
 *     const gate = requireTier(project.tier, "funding_brief");
 *     if (!gate.allowed) return { ok: false, gate };
 *
 * The boolean version that throws is intentionally NOT exported — see the
 * module-doc: server actions should branch on the typed result so they can
 * return a clean response rather than a 500.
 */
export function requireTier(
  currentTier: ProjectTier,
  artefact: TierArtefact,
): TierGateResult {
  return checkTierAccess({ current_tier: currentTier, artefact });
}
