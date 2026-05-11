import type { NextConfig } from "next";

const NOINDEX_VALUE = "noindex, nofollow";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "128kb",
    },
  },
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
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
