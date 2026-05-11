import { describe, it, expect } from "vitest";
import { generateToken, hashToken, verifyToken } from "@/lib/tokens";

describe("access tokens (FR-002, R6)", () => {
  it("generates 32-char base64url plaintext (≥ 192 bits of entropy)", () => {
    for (let i = 0; i < 50; i++) {
      const { plaintext } = generateToken();
      expect(plaintext).toMatch(/^[A-Za-z0-9_-]{32}$/);
    }
  });

  it("hashes are deterministic for the same plaintext", () => {
    const t = generateToken();
    expect(hashToken(t.plaintext)).toBe(t.hash);
    expect(hashToken(t.plaintext)).toBe(hashToken(t.plaintext));
  });

  it("two distinct tokens never collide (within 1000 samples)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const { hash } = generateToken();
      expect(seen.has(hash)).toBe(false);
      seen.add(hash);
    }
  });

  it("verifyToken returns true for matching plaintext+hash", () => {
    const { plaintext, hash } = generateToken();
    expect(verifyToken(plaintext, hash)).toBe(true);
  });

  it("verifyToken returns false for tampered plaintext", () => {
    const { plaintext, hash } = generateToken();
    const tampered = plaintext.slice(0, -1) + (plaintext.endsWith("a") ? "b" : "a");
    expect(verifyToken(tampered, hash)).toBe(false);
  });

  it("verifyToken handles invalid hash strings gracefully", () => {
    expect(verifyToken("anything", "not-hex")).toBe(false);
    expect(verifyToken("anything", "")).toBe(false);
  });
});
