import { describe, it, expect } from "vitest";

import { checkTierAccess, requireTier } from "@/lib/auth/tier-gate";
import {
  ARTEFACT_LABELS,
  TIERS,
  tierIncludes,
  artefactsAddedBetween,
  nextTier,
  type TierArtefact,
} from "@/lib/tier/differences";

/**
 * T126 — Contract test: free-tier project cannot reach paid-tier output
 * (FR-082). Also pins the catalog invariants the upgrade page depends on.
 */

describe("tier-gate — free tier cannot access paid output (FR-082 / T126)", () => {
  it("blocks free_scan from reaching the audit questionnaire", () => {
    const res = checkTierAccess({
      current_tier: "free_scan",
      artefact: "audit_questionnaire",
    });
    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.reason).toBe("tier_insufficient");
      expect(res.required_tier).toBe("mini");
      expect(res.upgrade_url).toBe("/upgrade?from=free_scan&to=mini");
    }
  });

  it("blocks free_scan from reaching the funding brief", () => {
    const res = checkTierAccess({
      current_tier: "free_scan",
      artefact: "funding_brief",
    });
    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.required_tier).toBe("full");
    }
  });

  it("blocks free_scan from reaching compliance findings", () => {
    const res = checkTierAccess({
      current_tier: "free_scan",
      artefact: "compliance_findings",
    });
    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.required_tier).toBe("full");
    }
  });

  it("blocks mini from reaching the compliance findings + funding brief", () => {
    expect(
      checkTierAccess({ current_tier: "mini", artefact: "compliance_findings" }).allowed,
    ).toBe(false);
    expect(
      checkTierAccess({ current_tier: "mini", artefact: "funding_brief" }).allowed,
    ).toBe(false);
  });

  it("blocks full from consultant-only artefacts (consultant_review)", () => {
    const res = checkTierAccess({
      current_tier: "full",
      artefact: "consultant_review",
    });
    expect(res.allowed).toBe(false);
    if (!res.allowed) {
      expect(res.required_tier).toBe("consultant_assisted");
    }
  });

  it("allows the free-scan summary at every tier", () => {
    for (const t of TIERS) {
      expect(
        checkTierAccess({ current_tier: t.tier, artefact: "free_scan_summary" })
          .allowed,
      ).toBe(true);
    }
  });

  it("allows the funding brief at full and above", () => {
    expect(tierIncludes("free_scan", "funding_brief")).toBe(false);
    expect(tierIncludes("mini", "funding_brief")).toBe(false);
    expect(tierIncludes("full", "funding_brief")).toBe(true);
    expect(tierIncludes("consultant_assisted", "funding_brief")).toBe(true);
    expect(tierIncludes("implementation", "funding_brief")).toBe(true);
  });

  it("requireTier() is a thin alias for checkTierAccess()", () => {
    const a = requireTier("free_scan", "funding_brief");
    const b = checkTierAccess({ current_tier: "free_scan", artefact: "funding_brief" });
    expect(a).toEqual(b);
  });
});

describe("tier ladder invariants (FR-080)", () => {
  it("each tier is a superset of the previous one", () => {
    for (let i = 1; i < TIERS.length; i++) {
      const prev = TIERS[i - 1]!;
      const cur = TIERS[i]!;
      for (const a of prev.artefacts) {
        expect(cur.artefacts).toContain(a);
      }
    }
  });

  it("each tier adds at least one new artefact over the previous (no decorative tiers)", () => {
    for (let i = 1; i < TIERS.length; i++) {
      const prev = TIERS[i - 1]!.tier;
      const cur = TIERS[i]!.tier;
      const added = artefactsAddedBetween(prev, cur);
      expect(added.length).toBeGreaterThan(0);
    }
  });

  it("nextTier() walks the ladder and returns null at the top", () => {
    expect(nextTier("free_scan")).toBe("mini");
    expect(nextTier("mini")).toBe("full");
    expect(nextTier("full")).toBe("consultant_assisted");
    expect(nextTier("consultant_assisted")).toBe("implementation");
    expect(nextTier("implementation")).toBeNull();
  });

  it("every artefact key appears in at least one tier", () => {
    const all = Object.keys(ARTEFACT_LABELS) as TierArtefact[];
    for (const a of all) {
      expect(TIERS.some((t) => t.artefacts.includes(a))).toBe(true);
    }
  });
});
