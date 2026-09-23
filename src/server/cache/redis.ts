import Redis from "ioredis";
import { env } from "@/env";

/**
 * Lazy Redis client, or null when REDIS_URL is not set. Redis is an accelerator here, never
 * the source of truth: every caller must work (slower) without it, so a Redis outage
 * degrades the office instead of stopping it.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis | null };

export function redis(): Redis | null {
  if (globalForRedis.redis !== undefined) return globalForRedis.redis;
  const client = env.REDIS_URL
    ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: false })
    : null;
  client?.on("error", (e) => console.error("[redis]", e.message));
  globalForRedis.redis = client;
  return client;
}
