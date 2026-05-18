import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware — feature 003 update (T032).
 *
 * Routing surface map (constitution + spec.md):
 *  - `/`               public free-scan landing — INDEXABLE.
 *  - `/scan/:id`       public free-scan result — INDEXABLE (shareable).
 *  - `/api/scan/*`     public anonymous scan endpoints — no auth, IP rate-limited.
 *  - `/upgrade`        public tier-upgrade pathway — INDEXABLE.
 *  - `/a/:token`       tokenized client routes — `noindex` (auth via URL token).
 *  - `/admin/*`        admin surfaces — `noindex` and auth-gated (except /admin/login).
 *
 * NOTE: Auth-gating for `/admin/*` previously lived here via NextAuth. The
 * feature-001 auth wiring (`@/lib/auth/edge-config`) is not present in this
 * worktree; the auth-gate edge route is re-added when feature-001 auth lands.
 * The `noindex` header for tokenized + admin routes IS in force.
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  const noindex =
    pathname.startsWith("/a/") || pathname.startsWith("/admin/");

  if (noindex) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return res;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
