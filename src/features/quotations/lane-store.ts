import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { officeToday } from "@/server/clock";
import type { DbOrTx } from "@/server/db/client";
import { rateItems } from "@/server/db/schema";
import { insertPricedLine, Refused } from "./editor-store";

// Internal to the quotation editor: a destination started from an ocean leg of the catalogue.

type Lane = typeof rateItems.$inferSelect;

export async function oceanLeg(tx: DbOrTx, id: string): Promise<Lane> {
  const [lane] = await tx.select().from(rateItems).where(eq(rateItems.id, id));
  if (!lane || lane.category !== "ocean" || lane.archivedAt)
    throw new Refused("Pick an ocean leg from the catalogue.");
  return lane;
}

/**
 * The lines a destination starts with (legacy fillRouteLines): the leg itself, then the
 * documents its country requires. Each is priced for the customer.
 */
export async function fillFromLane(
  tx: DbOrTx,
  p: { q: { id: string; clientId: string }; lane: Lane; routeId: string; userId: string },
) {
  const docs = p.lane.country
    ? await tx
        .select({ id: rateItems.id })
        .from(rateItems)
        .where(
          and(
            eq(rateItems.category, "docs"),
            eq(rateItems.country, p.lane.country),
            isNull(rateItems.archivedAt),
          ),
        )
    : [];
  const day = officeToday();
  for (const [position, itemId] of [p.lane.id, ...docs.map((x) => x.id)].entries())
    await insertPricedLine(tx, {
      q: p.q,
      routeId: p.routeId,
      itemId,
      qty: 1,
      position,
      day,
      userId: p.userId,
    });
}
