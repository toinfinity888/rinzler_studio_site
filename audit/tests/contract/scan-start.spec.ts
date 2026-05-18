import { describe, it, expect, beforeEach, vi } from "vitest";

import { guardUrl } from "@/lib/scanner/url-guard";

/**
 * T047 — Contract test for `POST /api/scan/start` happy paths.
 *
 * The full end-to-end (network + Postgres + BullMQ) path is exercised by the
 * E2E test (T049) once Postgres+Redis are available. This contract test
 * covers the pure pieces that don't need infra:
 *  - URL normalization rules
 *  - The shape of the start-scan validation outcomes
 *  - The dedup short-circuit logic (mocked DB)
 */

describe("scan start — URL normalization (FR-006, public-server-actions.md)", () => {
  it("accepts a normal hotel URL and lowercases the host", () => {
    const r = guardUrl("HTTPS://Example-Hotel.COM/");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.canonical).toBe("https://example-hotel.com");
    }
  });

  it("strips leading www and trailing slash", () => {
    const r = guardUrl("https://www.hotel.example/");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.canonical).toBe("https://hotel.example");
    }
  });

  it("accepts bare hostnames (defaults to https)", () => {
    const r = guardUrl("hotel.example");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.normalized.startsWith("https://hotel.example")).toBe(true);
    }
  });

  it("treats identical hosts with different paths as different canonicals", () => {
    const a = guardUrl("https://hotel.example/");
    const b = guardUrl("https://hotel.example/contact");
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.canonical).not.toBe(b.canonical);
    }
  });
});

describe("scan start — dedup logic", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the cached scan when a fresh succeeded row exists", async () => {
    const fakeRow = {
      id: "cached-scan-id",
      projectId: "cached-project-id",
      url: "https://hotel.example",
      canonicalUrl: "https://hotel.example",
      status: "succeeded" as const,
      finishedAt: new Date(),
      freshnessExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    vi.doMock("@/lib/db", () => {
      const orderBy = vi.fn().mockReturnThis();
      const limit = vi.fn().mockResolvedValue([fakeRow]);
      const where = vi.fn().mockReturnValue({ orderBy, limit });
      const from = vi.fn().mockReturnValue({ where });
      return {
        db: {
          select: vi.fn().mockReturnValue({ from }),
          insert: vi.fn(),
          update: vi.fn(),
        },
      };
    });

    vi.doMock("@/lib/auth/rate-limit", () => ({
      FREE_SCAN_RATE_LIMIT: { capacity: 5, windowMs: 60 * 60 * 1000 },
      consumeRateLimit: vi.fn(() => ({ ok: true, remaining: 4, resetMs: 0 })),
    }));

    vi.doMock("@/workers/scan.worker", () => ({
      enqueueScanRun: vi.fn(),
      registerScanWorker: vi.fn(),
      SCAN_QUEUE: "scan",
    }));

    const { startScan } = await import("@/lib/scanner/start-scan");
    const result = await startScan({ url: "https://hotel.example", ip: "1.2.3.4" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reusedCached).toBe(true);
      expect(result.status).toBe("succeeded");
      expect(result.scanId).toBe("cached-scan-id");
    }
  });
});
