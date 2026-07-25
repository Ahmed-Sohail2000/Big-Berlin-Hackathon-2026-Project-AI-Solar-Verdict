import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    // The reonic KNN recommender lazy-loads 1,277 projects + 19,257 line items
    // on first call; that cold import legitimately exceeds vitest's 5s default
    // on a loaded machine. Give deterministic (not logic-failing) tests headroom
    // so the suite stays green in CI and locally.
    testTimeout: 20000,
    hookTimeout: 20000,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
