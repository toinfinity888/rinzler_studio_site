import type { NextConfig } from "next";

const NOINDEX_VALUE = "noindex, nofollow";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the workspace root to the audit/ directory so standalone output
  // doesn't get nested under audit/ (which is what caused the earlier
  // deploy layout to be wrong — Next had detected the repo-root
  // package.json and treated this as a monorepo workspace).
  outputFileTracingRoot: process.cwd(),
  // Force-include native bindings that Next's tracer skips because they
  // sit behind async callbacks (Auth.js authorize() in particular).
  // In Next 15 this lives at the top level, no longer under experimental.
  outputFileTracingIncludes: {
    "*": [
      "./node_modules/@node-rs/argon2/**",
      "./node_modules/@node-rs/argon2-*/**",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "128kb",
    },
  },
  // Treat these packages as runtime externals (not webpack-bundled).
  // Three reasons they need to be here:
  //   1. @node-rs/argon2 — native binding; can't be bundled.
  //   2. mysql2 + drizzle-orm — used by tsx-run scripts/migrate.ts and
  //      scripts/seed-admin.ts. Those scripts resolve modules through Node's
  //      plain node_modules lookup, so the packages MUST be physically in
  //      standalone/node_modules/. Externalizing them here makes Next's
  //      tracer copy them.
  serverExternalPackages: ["@node-rs/argon2", "mysql2", "drizzle-orm"],
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: NOINDEX_VALUE }],
      },
      {
        source: "/a/:path*",
        headers: [{ key: "X-Robots-Tag", value: NOINDEX_VALUE }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: NOINDEX_VALUE }],
      },
    ];
  },
};

export default nextConfig;
