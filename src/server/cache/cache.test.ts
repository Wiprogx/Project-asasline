import Redis from "ioredis";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Needs a real Redis (a mock cannot show key expiry): runs where REDIS_URL is set.
const url = process.env.REDIS_URL;

describe.skipIf(!url)("cached + invalidateTags on a real Redis", () => {
  const client = url ? new Redis(url) : null;
  (globalThis as unknown as { redis?: Redis | null }).redis = client;
  const run = Math.random().toString(36).slice(2);

  afterAll(() => client?.disconnect());

  it("lets a tag outlive its longest key, whatever order keys join it", async () => {
    vi.stubEnv("DATABASE_URL", process.env.DATABASE_URL ?? "postgres://x@localhost/x");
    const { cached } = await import("./cache");
    const tag = `test:${run}:a`;
    await cached(`test:${run}:long`, { ttlSeconds: 300, tags: [tag] }, async () => 1);
    await cached(`test:${run}:short`, { ttlSeconds: 30, tags: [tag] }, async () => 2);
    expect(await client!.ttl(`asl:tag:${tag}`)).toBeGreaterThan(300);
  });

  it("drops every key of a tag on invalidation", async () => {
    const { cached, invalidateTags } = await import("./cache");
    const tag = `test:${run}:b`;
    await cached(`test:${run}:one`, { ttlSeconds: 300, tags: [tag] }, async () => "old");
    await invalidateTags(tag);
    const fresh = await cached(
      `test:${run}:one`,
      { ttlSeconds: 300, tags: [tag] },
      async () => "new",
    );
    expect(fresh).toBe("new");
  });
});
