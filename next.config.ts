import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS repo. Without it, Turbopack/Next infers the
  // root from the nearest lockfile and can walk up to a stray
  // `C:\Users\ahmed\package-lock.json`, which produces intermittent RSC
  // bundler 404/500s on API routes. Anchoring it here makes builds and the dev
  // server deterministic regardless of lockfiles above the project.
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
  env: {
    NEXT_PUBLIC_CESIUM_BASE_URL: "/cesium",
  },
  webpack: (config) => {
    config.module.rules.push({ test: /\.glb$/, type: "asset/resource" });
    return config;
  },
};

export default nextConfig;
