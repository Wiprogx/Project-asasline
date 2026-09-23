import { redis } from "./redis";

const PREFIX = "asl:cache:";
const TAG = "asl:tag:";

/**
 * Read-through cache with tag invalidation. `fn` is the truth; Redis only remembers its last
 * answer for `ttlSeconds`, and every write path invalidates the tags it touched. On any Redis
 * failure the value is computed directly — a cache miss, never an error.
 */
export async function cached<T>(
  key: string,
  opts: { ttlSeconds: number; tags: string[] },
  fn: () => Promise<T>,
): Promise<T> {
  const r = redis();
  if (!r) return fn();
  const k = PREFIX + key;
  try {
    const hit = await r.get(k);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch {
    return fn();
  }
  const value = await fn();
  try {
    const m = r.multi().set(k, JSON.stringify(value), "EX", opts.ttlSeconds);
    for (const t of opts.tags) m.sadd(TAG + t, k).expire(TAG + t, opts.ttlSeconds * 2);
    await m.exec();
  } catch {
    // A failed write only means the next read computes again.
  }
  return value;
}

/** Drops every cached value carrying any of the tags. Call after the transaction commits. */
export async function invalidateTags(...tags: string[]): Promise<void> {
  const r = redis();
  if (!r) return;
  try {
    for (const t of tags) {
      const keys = await r.smembers(TAG + t);
      if (keys.length) await r.unlink(...keys);
      await r.unlink(TAG + t);
    }
  } catch (e) {
    console.error("[cache] invalidate failed", tags, e);
  }
}

export const tags = {
  contacts: "contacts",
  contact: (id: string) => `contact:${id}`,
  bookings: "bookings",
  booking: (id: string) => `booking:${id}`,
  quotations: "quotations",
  dashboard: "dashboard",
} as const;
