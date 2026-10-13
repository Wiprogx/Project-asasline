import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

config({ path: ".env.local" });

/**
 * With TEST_DATABASE_URL set, the server the suite starts runs on that throwaway database and
 * on the cache's index 1 (scripts/e2e-prepare.ts reset both); a server already on :3000 is
 * then not reused, because it would be on the office's own database.
 */
const testDb = process.env.TEST_DATABASE_URL;
if (testDb) {
  process.env.DATABASE_URL = testDb;
  if (process.env.REDIS_URL) {
    const u = new URL(process.env.REDIS_URL);
    u.pathname = "/1";
    process.env.REDIS_URL = u.toString();
  }
}

/**
 * Browser suite: drives the real app against the real database (docker compose up).
 * It runs on its own port (E2E_PORT, 3001 by default) and builds into its own folder
 * (NEXT_DIST_DIR=.next-e2e), so it can run while `npm run dev` serves the office on :3000.
 * Tests create uniquely named records, so they can run against a dev database without clashing.
 */
const port = process.env.E2E_PORT ?? "3001";
// A production run (E2E_SERVER_CMD, after `npm run build`) serves whatever folder that build
// wrote; only the suite's own dev server is sent to .next-e2e by default.
const serverCmd = process.env.E2E_SERVER_CMD;
if (!serverCmd) process.env.NEXT_DIST_DIR ??= ".next-e2e";
// `npm run x` needs `--` before an argument meant for the script itself.
const command = serverCmd
  ? `${serverCmd}${serverCmd.startsWith("npm ") ? " --" : ""} --port ${port}`
  : `npx next dev --port ${port}`;
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  // One at a time: Settings tests change office-wide tables (rules, holidays, lists).
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: {
    // CI serves the production build (E2E_SERVER_CMD=npm run start); locally, the dev server.
    command,
    url: `http://localhost:${port}/login`,
    reuseExistingServer: !testDb,
    timeout: 120_000,
  },
});
