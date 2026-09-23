import { redis } from "./redis";

/**
 * Fixed-window counter. Redis when available so the limit holds across instances; an
 * in-process map otherwise (single dev server). Legacy limits: 6 failures per email and 40
 * per IP (the office sits behind one NAT) per 15 minutes.
 */
const memory = new Map<string, { count: number; resetAt: number }>();

export async function hit(key: string, windowSeconds: number): Promise<number> {
  const r = redis();
  const k = `asl:rl:${key}`;
  if (r) {
    try {
      const [[, count]] = (await r.multi().incr(k).expire(k, windowSeconds, "NX").exec()) as [
        [Error | null, number],
      ];
      return count;
    } catch {
      // fall through to memory
    }
  }
  const now = Date.now();
  const cur = memory.get(k);
  if (!cur || cur.resetAt < now) {
    memory.set(k, { count: 1, resetAt: now + windowSeconds * 1000 });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

export async function peek(key: string): Promise<number> {
  const r = redis();
  const k = `asl:rl:${key}`;
  if (r) {
    try {
      return Number((await r.get(k)) ?? 0);
    } catch {
      // fall through
    }
  }
  const cur = memory.get(k);
  return cur && cur.resetAt >= Date.now() ? cur.count : 0;
}

export async function reset(key: string): Promise<void> {
  memory.delete(`asl:rl:${key}`);
  await redis()
    ?.unlink(`asl:rl:${key}`)
    .catch(() => undefined);
}
