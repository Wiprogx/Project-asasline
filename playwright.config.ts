import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.local" });

/**
 * Browser suite: drives the real app against the real database (docker compose up).
 * Reuses a running `npm run dev` on :3000, or starts one. Tests create uniquely named
 * records, so they can run against a dev database without clashing.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  // One at a time: Settings tests change office-wide tables (rules, holidays, lists).
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: {
    // CI serves the production build (E2E_SERVER_CMD=npm run start); locally, the dev server.
    command: process.env.E2E_SERVER_CMD ?? "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
