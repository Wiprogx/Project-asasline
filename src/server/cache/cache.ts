import { redis } from "./redis";

const PREFIX = "asl:cache:";
const TAG = "asl:tag:";
const GEN = "asl:gen:";

/**
 * One round trip, atomic: every key of each tag set is dropped, then the set, and the tag's
 * generation moves on so a read that was computing meanwhile knows not to keep its value.
 * The members are unlinked in slices: Lua's unpack has a ceiling on its arguments.
 */
const INVALIDATE = `
local n = 0
for i = 1, #KEYS do
  local ks = redis.call('SMEMBERS', KEYS[i])
  for j = 1, #ks, 500 do
    n = n + redis.call('UNLINK', unpack(ks, j, math.min(j + 499, #ks)))
  end
  redis.call('UNLINK', KEYS[i])
  redis.call('INCR', ARGV[i])
end
return n`;

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
  const gens = opts.tags.map((t) => GEN + t);
  let before: (string | null)[] = [];
  try {
    const hit = await r.get(k);
    if (hit !== null) return JSON.parse(hit) as T;
    if (gens.length) before = await r.mget(...gens);
  } catch {
    return fn();
  }
  const value = await fn();
  try {
    // A write that landed while fn() ran moved a generation on: what was computed may already
    // be stale, so it is returned but not kept (the old code kept it for the whole TTL).
    const after = gens.length ? await r.mget(...gens) : [];
    if (after.some((g, i) => g !== before[i])) return value;
    const m = r.multi().set(k, JSON.stringify(value), "EX", opts.ttlSeconds);
    // A tag set must outlive every key in it, or invalidation misses the longest-lived ones:
    // set its expiry when it has none (NX), otherwise only ever raise it (GT) — never shorten.
    for (const t of opts.tags)
      m.sadd(TAG + t, k)
        .expire(TAG + t, opts.ttlSeconds * 2, "NX")
        .expire(TAG + t, opts.ttlSeconds * 2, "GT");
    await m.exec();
  } catch {
    // A failed write only means the next read computes again.
  }
  return value;
}

/** Drops every cached value carrying any of the tags. Call after the transaction commits. */
export async function invalidateTags(...tags: string[]): Promise<void> {
  const r = redis();
  if (!r || tags.length === 0) return;
  try {
    await r.eval(INVALIDATE, tags.length, ...tags.map((t) => TAG + t), ...tags.map((t) => GEN + t));
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
