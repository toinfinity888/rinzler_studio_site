import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config. MUST NOT import anything that pulls in
 * Node-only modules (no `server-only`, no `node:crypto`, no DB, no
 * `@node-rs/argon2`). Used by middleware.ts to evaluate the JWT cookie
 * without invoking the Credentials authorize() callback.
 *
 * The full config in `./config.ts` extends this and adds the Credentials
 * provider that talks to the DB. Pattern documented in Auth.js v5 docs:
 * https://authjs.dev/guides/edge-compatibility
 */
export const edgeAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  // Providers are intentionally empty here — they are set in `./config.ts`.
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        (session.user as { id?: string }).id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
