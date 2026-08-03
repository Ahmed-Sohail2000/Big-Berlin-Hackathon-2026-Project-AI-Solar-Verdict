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
    // The reonic KNN fixture (1,277 projects + 19,257 line items) is
    // memory-heavy; too many parallel workers can OOM a fork ("worker exited
    // unexpectedly") on constrained machines. Cap the worker count and give
    // each a larger heap so the suite stays reliably green. (vitest 4 flattened
    // the old `poolOptions.forks` block into these top-level `test` options.)
    pool: "forks",
    maxWorkers: 2,
    execArgv: ["--max-old-space-size=2048"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
