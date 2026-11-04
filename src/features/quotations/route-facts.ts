import "server-only";
import { eq, inArray } from "drizzle-orm";
import { portWords } from "@/domain/ports";
import { db } from "@/server/db/client";
import { contacts, rateItems } from "@/server/db/schema";
import { livePorts } from "@/server/ports";

type RouteIn = { laneId: string | null; pol: string | null; pod: string | null };

export type RouteFacts = {
  /** The ports as the page and the paper spell them, "Antwerp (BE) (BEANR)"; a code the table lacks stays. */
  polWords: string;
  podWords: string;
  /** From the ocean leg the destination was built from: its shipping line and its transit. */
  carrier: string | null;
  transitDays: number | null;
};

/** The lanes behind these destinations, each with its line's name. */
async function lanesOf(ids: readonly string[]) {
  if (!ids.length) return [];
  return db
    .select({
      id: rateItems.id,
      carrier: contacts.name,
      transitDays: rateItems.transitDays,
    })
    .from(rateItems)
    .leftJoin(contacts, eq(contacts.id, rateItems.carrierId))
    .where(inArray(rateItems.id, ids));
}

/**
 * Each destination with its ports in words and what its ocean leg says (legacy dest-meta:
 * "MSC · 22 days"), read after `withRouteWords` gave it its port codes.
 */
export async function withRouteFacts<T extends RouteIn>(
  routes: readonly T[],
): Promise<(T & RouteFacts)[]> {
  const laneIds = [...new Set(routes.map((r) => r.laneId).filter((id): id is string => !!id))];
  const [ports, lanes] = await Promise.all([livePorts(), lanesOf(laneIds)]);
  const byCode = new Map(ports.map((p) => [p.code, p]));
  const byLane = new Map(lanes.map((l) => [l.id, l]));
  const words = (code: string | null) => {
    const p = code ? byCode.get(code) : undefined;
    return p ? portWords(p) : (code ?? "");
  };
  return routes.map((r) => {
    const lane = r.laneId ? byLane.get(r.laneId) : undefined;
    return {
      ...r,
      polWords: words(r.pol),
      podWords: words(r.pod),
      carrier: lane?.carrier ?? null,
      transitDays: lane?.transitDays ?? null,
    };
  });
}
