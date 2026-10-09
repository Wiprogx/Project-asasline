/**
 * Before the browser suite: a clean throwaway database, migrated and seeded, and an empty
 * cache for it. With TEST_DATABASE_URL set (a database whose name ends in `_e2e`, or
 * `ci_test`), that database is dropped to an empty schema first — the suite's records never
 * pile up from one run to the next, so a capped list still shows what a journey just made.
 * Without it the suite runs on DATABASE_URL as it is, and nothing is dropped: the office's
 * data is never a throwaway.
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import Redis from "ioredis";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL (or TEST_DATABASE_URL) is needed");
  const name = new URL(url).pathname.slice(1);
  const throwaway = /_e2e$|^ci_test$/.test(name);

  /** The suite's own Redis index (abatty.config suiteEnv): index 1 of the configured server. */
  const redisUrl = (() => {
    const base = process.env.TEST_REDIS_URL ?? process.env.REDIS_URL;
    if (!base) return undefined;
    const u = new URL(base);
    u.pathname = "/1";
    return u.toString();
  })();

  if (throwaway) {
    const sql = postgres(url, { max: 1 });
    await sql.unsafe(
      "drop schema public cascade; drop schema if exists drizzle cascade; create schema public;",
    );
    await sql.end();
    console.log(`[e2e] ${name} reset to an empty schema`);
    if (redisUrl) {
      const r = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
      try {
        await r.connect();
        await r.flushdb();
        console.log("[e2e] cache index 1 flushed");
      } catch {
        console.log("[e2e] no Redis: nothing to flush");
      } finally {
        r.disconnect();
      }
    }
  } else {
    console.log(
      `[e2e] ${name} is not a throwaway database: kept as it is (set TEST_DATABASE_URL to a *_e2e database for a clean run)`,
    );
  }

  const env = { ...process.env, DATABASE_URL: url, ...(redisUrl ? { REDIS_URL: redisUrl } : {}) };
  for (const cmd of ["npx drizzle-kit migrate", "npx tsx scripts/seed.ts"]) {
    const r = spawnSync(cmd, { stdio: "inherit", env, shell: true });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
