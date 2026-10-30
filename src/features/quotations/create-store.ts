import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { type HsCode, hsDescription } from "@/domain/goods";
import { commodityWords, type RouteBox } from "@/domain/route-service";
import type { DbOrTx } from "@/server/db/client";
import { contacts, quotationRoutes } from "@/server/db/schema";
import { readHsCodes } from "@/server/goods-config";
import { readLoadingModes } from "@/server/loading-config";
import { Refused } from "./editor-store";
import { fillFromLane, oceanLeg } from "./lane-store";
import type { DestinationInput } from "./schemas";

// Internal to the new quotation: its destinations and what it ships, written in its transaction.

type Quote = { id: string; clientId: string; kind: "export" | "import" | "both" };

/** The loading addresses and the stops are live contacts (legacy: picked from the addresses). */
async function placesLive(tx: DbOrTx, dests: readonly DestinationInput[]) {
  const ids = [
    ...new Set(
      dests
        .flatMap((d) => [
          d.loadAddressId,
          ...d.stops.map((s) => s.contactId),
          ...d.boxDetails.flatMap((b) => [b.loadAddressId, ...b.stops.map((s) => s.contactId)]),
        ])
        .filter(Boolean),
    ),
  ] as string[];
  if (!ids.length) return;
  const live = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(inArray(contacts.id, ids), isNull(contacts.archivedAt)));
  if (live.length !== ids.length)
    throw new Refused("A loading address or a stop is archived or no longer exists.");
}

/**
 * One entry per container (quotation > destination > container > HS), whatever the count: a
 * single box is loaded as the destination is, two or more each as asked; each carries its HS
 * rows, the words of a code the list knows filled in.
 */
function boxesOf(d: DestinationInput, table: readonly HsCode[]): RouteBox[] {
  const door = d.service === "door_port";
  return Array.from({ length: d.boxes }, (_, i) => {
    const b = d.boxDetails[i];
    const own = d.boxes > 1 && !!b;
    return {
      loadingMode: own ? b.loadingMode : d.loadingMode,
      loadAddressId: door ? (own ? b.loadAddressId : d.loadAddressId) : null,
      stops: door ? (own ? b.stops : d.stops) : [],
      hs: (b?.hs ?? []).map((h) => ({
        code: h.code,
        description: h.description ?? hsDescription(table, h.code),
      })),
    };
  });
}

/**
 * Each destination as legacy builds it: the ocean leg gives its ports, its box and its first
 * lines (the leg, the country's documents, customs, VGM, free time), each priced for the
 * customer; the service, the loading, the stops and each container's goods are the person's.
 * Returns what the quotation ships, in words, from every box's HS rows.
 */
export async function createDestinations(
  tx: DbOrTx,
  q: Quote,
  dests: readonly DestinationInput[],
  userId: string,
): Promise<string | null> {
  await placesLive(tx, dests);
  const [modes, table] = await Promise.all([readLoadingModes(), readHsCodes()]);
  const all: RouteBox[] = [];
  for (const [position, d] of dests.entries()) {
    for (const mode of [d.loadingMode, ...d.boxDetails.map((b) => b.loadingMode)])
      if (mode && !modes.some((m) => m.name === mode))
        throw new Refused(`Loading mode "${mode}" is not in Settings › Loading modes.`);
    const lane = await oceanLeg(tx, d.laneId);
    const boxDetails = boxesOf(d, table);
    all.push(...boxDetails);
    const [route] = await tx
      .insert(quotationRoutes)
      .values({
        quotationId: q.id,
        position,
        polId: lane.polId,
        podId: lane.podId,
        containerTypeId: lane.containerTypeId,
        laneId: lane.id,
        service: d.service,
        boxes: d.boxes,
        loadingMode: d.loadingMode,
        loadAddressId: d.service === "door_port" ? d.loadAddressId : null,
        stops: d.service === "door_port" ? d.stops : [],
        boxDetails,
        createdBy: userId,
      })
      .returning({ id: quotationRoutes.id });
    await fillFromLane(tx, { q, lane, routeId: route.id, userId });
  }
  return commodityWords(all) || null;
}

export async function clientTerm(tx: DbOrTx, clientId: string) {
  const [c] = await tx
    .select({ termId: contacts.paymentTermId })
    .from(contacts)
    .where(eq(contacts.id, clientId));
  return c?.termId ?? null;
}
