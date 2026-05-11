import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { edgeAuthConfig } from "@/lib/auth/edge-config";

/**
 * Edge-runtime middleware: gates `/admin/*` (except `/admin/login`) using
 * the JWT cookie only — no DB access, no node:crypto. Uses the Edge-safe
 * Auth.js config to keep the bundle within Edge runtime constraints.
 *
 * Tokenized client routes (`/a/[token]`) authenticate via the URL token,
 * not a session, so they're excluded by the matcher below.
 */
const { auth } = NextAuth(edgeAuthConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!req.auth) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
