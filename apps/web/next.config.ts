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
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "";
    const supabaseWss = supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, "wss://") : "";
    const isDev = process.env.NODE_ENV === "development";

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: https://lh3.googleusercontent.com ${supabaseHost}`.trim(),
      `connect-src 'self' ${supabaseHost} ${supabaseWss}`.trim(),
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
