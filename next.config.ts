import type { NextConfig } from "next";
import path from "node:path";

const development = process.env.NODE_ENV === "development";

/**
 * Enforces the privacy promise in the browser: `connect-src` and `form-action`
 * leave no route for page code to send a photo to another host, and the app has no
 * server route that accepts one. `unsafe-inline` covers Next.js bootstrap scripts
 * and the theme script; `wasm-unsafe-eval` covers local HEIC decoding.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' blob:${development ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pin the workspace root to this repo so a stray lockfile higher up the
  // directory tree cannot change how the project resolves.
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
