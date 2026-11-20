import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // src/env.ts validates on import; unit tests never connect to the
    // database, integration tests get a real URL from tests/setup.
    env: {
      DATABASE_URL: "postgresql://unused@localhost:5432/unused",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "test-password",
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/setup/test-database.ts"],
          setupFiles: ["tests/setup/use-test-database.ts"],
          // One throwaway database per run, shared by the files in order.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
