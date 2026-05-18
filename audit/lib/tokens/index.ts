import crypto from "node:crypto";

/**
 * Access-token primitives (R6 in research.md).
 * - Plaintext: 24 bytes (192 bits) base64url encoded → 32 chars URL-safe.
 *   Far above the FR-002 minimum of 128 bits of entropy.
 * - Storage: SHA-256 hash only. The plaintext is shown to the admin once
 *   at creation and never persisted.
 * - Verification: constant-time `crypto.timingSafeEqual` comparison.
 */

export interface GeneratedToken {
  plaintext: string;
  hash: string;
}

export function generateToken(): GeneratedToken {
  const plaintext = crypto.randomBytes(24).toString("base64url");
  const hash = hashToken(plaintext);
  return { plaintext, hash };
}

export function hashToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export function verifyToken(plaintext: string, storedHash: string): boolean {
  const candidate = hashToken(plaintext);
  if (candidate.length !== storedHash.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}
