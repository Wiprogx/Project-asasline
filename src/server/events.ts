import "server-only";
import { redis } from "./cache/redis";

/**
 * Office-wide change notifications over Redis pub/sub. The legacy app polled every five
 * seconds; here a write publishes one small event and every open screen that cares refreshes.
 * Events carry no data — only what changed — so a screen always re-reads through its own
 * permission-checked query. Without Redis nothing is published and screens fall back to
 * their own refresh.
 */
export const EVENTS_CHANNEL = "asl:events";

export type OfficeEvent = { type: "message"; room?: string | null; linkId?: string | null };

export async function publish(event: OfficeEvent): Promise<void> {
  try {
    await redis()?.publish(EVENTS_CHANNEL, JSON.stringify(event));
  } catch (e) {
    console.error("[events] publish failed", e);
  }
}
