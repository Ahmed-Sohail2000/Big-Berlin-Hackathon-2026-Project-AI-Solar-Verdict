import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    testTimeout: 20000,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
