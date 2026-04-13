import { defineConfig } from "@playwright/test";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      DATABASE_URL,
      NODE_ENV: "development",
      SITE_URL: "http://localhost:3000",
      EMAIL_FROM: "BreachLab <noreply@localhost>",
    },
  },
});
