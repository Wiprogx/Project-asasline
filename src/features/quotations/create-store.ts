import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { hsDescription } from "@/domain/goods";
import type { DbOrTx } from "@/server/db/client";
import { contacts, quotationCommodities, quotationRoutes } from "@/server/db/schema";
import { readHsCodes } from "@/server/goods-config";
import { readLoadingModes } from "@/server/loading-config";
import { Refused } from "./editor-store";
import { fillFromLane, oceanLeg } from "./lane-store";
import type { DestinationInput } from "./schemas";

// Internal to the new quotation: its destinations and what it ships, written in its transaction.

type Quote = { id: string; clientId: string; kind: "export" | "import" | "both" };

/** The loading address and the stops are live contacts (legacy: picked from the addresses). */
async function placesLive(tx: DbOrTx, dests: readonly DestinationInput[]) {
  const ids = [
    ...new Set(
      dests.flatMap((d) => [d.loadAddressId, ...d.stops.map((s) => s.contactId)]).filter(Boolean),
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
 * Each destination as legacy builds it: the ocean leg gives its ports, its box and its first
 * lines (the leg, the country's documents, customs, VGM, free time), each priced for the
 * customer; the service, the loading and the stops are the person's.
 */
export async function createDestinations(
  tx: DbOrTx,
  q: Quote,
  dests: readonly DestinationInput[],
  userId: string,
) {
  await placesLive(tx, dests);
  const modes = await readLoadingModes();
  for (const [position, d] of dests.entries()) {
    if (d.loadingMode && !modes.some((m) => m.name === d.loadingMode))
      throw new Refused(`Loading mode "${d.loadingMode}" is not in Settings › Loading modes.`);
    const lane = await oceanLeg(tx, d.laneId);
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
        createdBy: userId,
      })
      .returning({ id: quotationRoutes.id });
    await fillFromLane(tx, { q, lane, routeId: route.id, userId });
  }
}

/**
 * What the quotation ships, one row per product, and the commodity words the letters and the
 * booking read ("630900 Worn clothes, 940360 Wooden furniture").
 */
export async function saveCommodities(
  tx: DbOrTx,
  quotationId: string,
  rows: readonly { code: string; description: string | null }[],
  userId: string,
): Promise<string | null> {
  if (!rows.length) return null;
  const table = await readHsCodes();
  const named = rows.map((r) => ({
    ...r,
    description: r.description ?? (hsDescription(table, r.code) || null),
  }));
  await tx.insert(quotationCommodities).values(
    named.map((r, position) => ({
      quotationId,
      position,
      code: r.code,
      description: r.description,
      createdBy: userId,
    })),
  );
  return named.map((r) => [r.code, r.description].filter(Boolean).join(" ")).join(", ");
}

export async function clientTerm(tx: DbOrTx, clientId: string) {
  const [c] = await tx
    .select({ termId: contacts.paymentTermId })
    .from(contacts)
    .where(eq(contacts.id, clientId));
  return c?.termId ?? null;
}
