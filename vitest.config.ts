import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "src/**/__tests__/**/*.test.{ts,tsx}",
    ],
    env: {
      // Dummy value so modules that read DATABASE_URL at import time don't
      // throw during unit tests. Real DB calls in tests must be mocked.
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
