import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage/error-monitoring",
      include: [
        "server/_core/error-ingest.ts",
        "server/_core/error-monitoring.ts",
        "server/_core/error-retention.ts",
        "server/_core/push-provider.ts",
      ],
      exclude: ["**/*.d.ts"],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
  },
});
