import type { NextConfig } from "next";
import { readFileSync } from "fs";
import path from "path";

const pkg = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8")) as {
  version: string;
};

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@kinwoo/core", "@kinwoo/client", "@kinwoo/icons"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // OpenNext only resizes images through a Cloudflare Images binding, which this app does not use;
  // without it every /_next/image request runs the Worker to return the original. Images ship
  // pre-sized instead and load straight from static assets.
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The Content-Security-Policy is set per request in middleware.ts, since it carries a nonce.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
