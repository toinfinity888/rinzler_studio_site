import { describe, it, expect } from "vitest";

import {
  DEFAULT_FRESHNESS_DAYS,
  freshnessStatus,
} from "@/lib/governance/freshness";
import {
  aggregateSourceLabel,
  renderSourceLabel,
  type ProvenanceLike,
} from "@/lib/governance/source-label";

/**
 * T131 — Freshness indicator (SC-012 / FR-111).
 *
 * A vendor entry verified longer ago than the freshness window must
 * surface a "stale" indicator. The render layer chips that to a soft
 * caveat for clients and to a precise message for internal viewers.
 */

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(NOW - n * DAY);
}

function makeRecord(overrides: Partial<ProvenanceLike> = {}): ProvenanceLike {
  return {
    source: "official_vendor",
    contributorLabel: "Vendor catalogue admin",
    lastVerifiedAt: daysAgo(30),
    confidence: "high",
    conflictNote: null,
    ...overrides,
  };
}

describe("freshness indicator surfaces stale vendor data (T131 / SC-012)", () => {
  it("marks an entry verified beyond DEFAULT_FRESHNESS_DAYS as stale", () => {
    const s = freshnessStatus(daysAgo(DEFAULT_FRESHNESS_DAYS + 10));
    expect(s.isStale).toBe(true);
    expect(s.ageDays).not.toBeNull();
    expect(s.ageDays!).toBeGreaterThan(DEFAULT_FRESHNESS_DAYS);
  });

  it("treats a never-verified entry as stale (ageDays=null)", () => {
    const s = freshnessStatus(null);
    expect(s.isStale).toBe(true);
    expect(s.ageDays).toBeNull();
  });

  it("does not flag a recently-verified entry", () => {
    const s = freshnessStatus(daysAgo(10));
    expect(s.isStale).toBe(false);
  });

  it("renderSourceLabel switches tone to 'warning' when stale", () => {
    const stale = renderSourceLabel(
      makeRecord({ lastVerifiedAt: daysAgo(DEFAULT_FRESHNESS_DAYS + 5) }),
      "internal",
    );
    expect(stale.isStale).toBe(true);
    expect(stale.tone).toBe("warning");
    expect(stale.label).toMatch(/à vérifier/);
  });

  it("client audience hides the age in days but still surfaces the caveat", () => {
    const stale = renderSourceLabel(
      makeRecord({ lastVerifiedAt: daysAgo(DEFAULT_FRESHNESS_DAYS + 5) }),
      "client",
    );
    expect(stale.isStale).toBe(true);
    expect(stale.ageDays).toBeNull();
    expect(stale.detail).toMatch(/information à vérifier/);
  });

  it("internal audience exposes contributor + age", () => {
    const stale = renderSourceLabel(
      makeRecord({
        contributorLabel: "Marie (vendor admin)",
        lastVerifiedAt: daysAgo(400),
      }),
      "internal",
    );
    expect(stale.detail).toMatch(/Marie/);
    expect(stale.detail).toMatch(/an/);
  });

  it("aggregateSourceLabel flags conflict when sources disagree", () => {
    const agg = aggregateSourceLabel(
      [
        makeRecord({ source: "official_vendor" }),
        makeRecord({ source: "client_reported" }),
      ],
      "internal",
    );
    expect(agg).not.toBeNull();
    expect(agg!.hasConflict).toBe(true);
  });

  it("aggregateSourceLabel does not flag conflict for a single source", () => {
    const agg = aggregateSourceLabel(
      [makeRecord({ source: "official_vendor" })],
      "client",
    );
    expect(agg).not.toBeNull();
    expect(agg!.hasConflict).toBe(false);
  });

  it("aggregateSourceLabel picks the most-trusted source as the lead", () => {
    const agg = aggregateSourceLabel(
      [
        makeRecord({ source: "ai_inferred", lastVerifiedAt: daysAgo(1) }),
        makeRecord({ source: "official_vendor", lastVerifiedAt: daysAgo(60) }),
      ],
      "internal",
    );
    expect(agg).not.toBeNull();
    // The aggregator chooses trusted-over-fresh: official_vendor wins
    // even though the ai_inferred row is newer.
    expect(agg!.label).toMatch(/officielle/);
  });
});
