/**
 * URL validation + canonicalization for the public scan endpoint
 * (public-server-actions.md anti-abuse — input layer).
 *
 * Rules:
 *  - Accept only http(s).
 *  - Reject IP literals, localhost, link-local, private RFC 1918 ranges.
 *  - Reject javascript:, data:, file:, mailto:.
 *  - Canonicalize: lowercase host, strip leading "www.", strip trailing slash.
 */

export interface UrlGuardOk {
  ok: true;
  normalized: string;
  canonical: string;
}

export interface UrlGuardErr {
  ok: false;
  reason:
    | "invalid_url"
    | "bad_scheme"
    | "ip_literal"
    | "internal_host"
    | "empty";
}

export type UrlGuardResult = UrlGuardOk | UrlGuardErr;

const FORBIDDEN_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "broadcasthost",
]);

export function guardUrl(raw: string | null | undefined): UrlGuardResult {
  if (!raw || typeof raw !== "string") return { ok: false, reason: "empty" };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };

  // Reject any explicit non-http(s) scheme BEFORE trying to default to https.
  // A scheme exists when the string contains "<word>:" before any "/".
  const schemeMatch = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(trimmed);
  if (schemeMatch) {
    const scheme = schemeMatch[1]!.toLowerCase();
    if (scheme !== "http" && scheme !== "https") {
      return { ok: false, reason: "bad_scheme" };
    }
  }

  let withScheme = trimmed;
  if (!/^https?:\/\//i.test(withScheme)) {
    withScheme = `https://${withScheme}`;
  }
  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "bad_scheme" };
  }
  const host = u.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "invalid_url" };
  if (FORBIDDEN_HOSTS.has(host)) return { ok: false, reason: "internal_host" };
  if (isIpLiteral(host)) {
    if (isPrivateOrLoopbackV4(host) || isLinkLocalV4(host)) {
      return { ok: false, reason: "internal_host" };
    }
    return { ok: false, reason: "ip_literal" };
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "internal_host" };
  }

  const strippedHost = host.replace(/^www\./, "");
  u.hostname = strippedHost;
  if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.slice(0, -1);
  }
  const normalized = u.toString();
  // Canonical form excludes the search/hash AND a bare "/" path for cache
  // reuse — two scans of the same hotel URL with different query strings
  // still reuse the same finding set in the MVP.
  const canonicalPath = u.pathname === "/" ? "" : u.pathname;
  const canonical = `${u.protocol}//${u.hostname}${canonicalPath}`;
  return { ok: true, normalized, canonical };
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

function isPrivateOrLoopbackV4(host: string): boolean {
  const parts = host.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const a = parts[0]!;
  const b = parts[1]!;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isLinkLocalV4(host: string): boolean {
  const parts = host.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  return parts[0] === 169 && parts[1] === 254;
}
