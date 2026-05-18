import { describe, it, expect } from "vitest";

import { guardUrl } from "@/lib/scanner/url-guard";

/**
 * T048 — Contract test for `POST /api/scan/start` rejection paths.
 *
 * Covers the URL anti-abuse posture (public-server-actions.md §"Anti-abuse"):
 *  - Invalid URLs
 *  - Bad schemes (javascript:, file:, data:, mailto:)
 *  - RFC 1918 / loopback / link-local internal hosts
 *  - IP literals
 *  - Empty inputs
 *
 * The rate-limit rejection itself is exercised by the unit test for
 * `consumeRateLimit` (capacity bucket); end-to-end rejection (HTTP 429) is
 * left to the E2E test (T049).
 */

describe("scan start — URL guard rejections", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/plain,hi",
    "file:///etc/passwd",
    "mailto:contact@hotel.com",
  ])("rejects bad scheme: %s", (input) => {
    const r = guardUrl(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(["bad_scheme", "invalid_url"]).toContain(r.reason);
    }
  });

  it.each([
    "http://localhost/",
    "http://127.0.0.1:3000/",
    "http://10.0.0.5/",
    "http://192.168.1.10/",
    "http://172.16.0.42/",
    "http://169.254.10.10/",
    "http://my-server.local/",
    "http://intranet.internal/",
  ])("rejects internal host: %s", (input) => {
    const r = guardUrl(input);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("internal_host");
    }
  });

  it("rejects public IP literals (no host context)", () => {
    const r = guardUrl("http://93.184.216.34/");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("ip_literal");
    }
  });

  it("rejects empty input", () => {
    expect(guardUrl("").ok).toBe(false);
    expect(guardUrl("   ").ok).toBe(false);
    expect(guardUrl(null as unknown as string).ok).toBe(false);
  });

  it("rejects malformed URLs", () => {
    const r = guardUrl("https://");
    expect(r.ok).toBe(false);
  });
});
