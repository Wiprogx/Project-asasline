import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type LinePlace, defaultPlace, placeLabel } from "../domain/line-places";
import { PLACE_ROLE_CODES } from "../domain/lookup-tables";
import { cityNameOf } from "./city-sql";
import type { DbOrTx } from "./db/client";
import { contactLinks, contacts, locationRoles } from "./db/schema";

export type RolePlaces = {
  depots: LinePlace[];
  terminals: LinePlace[];
  /** Every live location, for a depot or terminal not linked under the line that uses it. */
  locations: LinePlace[];
};

/**
 * Every live location linked to a live contact with the Depot or Terminal role (Settings ›
 * Lists › Location roles, by code), each once, naming the contacts it is linked under —
 * the most recently linked first, so the latest is the default (domain/line-places) — and
 * every live location besides, to be picked when the place is not the line's own.
 */
export async function rolePlaces(tx: DbOrTx): Promise<RolePlaces> {
  const locations = await liveLocations(tx);
  const rows = await tx
    .select({
      id: contacts.id,
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
      role: locationRoles.code,
      under: sql<string>`case when ${contactLinks.contactId} = ${contacts.id} then ${contactLinks.linkedId} else ${contactLinks.contactId} end`,
    })
    .from(contactLinks)
    .innerJoin(
      locationRoles,
      and(
        eq(locationRoles.id, contactLinks.locationRoleId),
        inArray(locationRoles.code, Object.values(PLACE_ROLE_CODES)),
      ),
    )
    .innerJoin(
      contacts,
      and(
        or(eq(contacts.id, contactLinks.linkedId), eq(contacts.id, contactLinks.contactId)),
        eq(contacts.type, "location"),
      ),
    )
    .where(and(isNull(contactLinks.archivedAt), isNull(contacts.archivedAt)))
    .orderBy(desc(contactLinks.createdAt));
  const byRole: Record<string, Map<string, LinePlace & { under: string[] }>> = {
    [PLACE_ROLE_CODES.depot]: new Map(),
    [PLACE_ROLE_CODES.terminal]: new Map(),
  };
  for (const r of rows) {
    const seen = byRole[r.role ?? ""];
    if (!seen) continue;
    const place = seen.get(r.id) ?? { value: r.id, label: placeLabel(r), under: [] };
    if (!place.under.includes(r.under)) place.under.push(r.under);
    seen.set(r.id, place);
  }
  return {
    depots: [...byRole[PLACE_ROLE_CODES.depot].values()],
    terminals: [...byRole[PLACE_ROLE_CODES.terminal].values()],
    locations,
  };
}

/**
 * Every live place, by name (legacy allAddrOptions): every live location, found by its own
 * name and by the names of the live contacts it is linked under, and every live company's own
 * address — a box may well be loaded at, or call at, a place of another contact than the
 * customer, searched by that company's name — offered after the customer's own places
 * (domain/load-place).
 */
export async function liveLocations(tx: DbOrTx): Promise<LinePlace[]> {
  const [rows, owners] = await Promise.all([
    tx
      .select({
        id: contacts.id,
        name: contacts.name,
        street: contacts.street,
        zip: contacts.zip,
        city: cityNameOf(contacts.cityId),
      })
      .from(contacts)
      .where(
        and(
          isNull(contacts.archivedAt),
          or(
            eq(contacts.type, "location"),
            and(eq(contacts.type, "company"), isNotNull(contacts.street)),
          ),
        ),
      )
      .orderBy(asc(contacts.name)),
    locationOwners(tx),
  ]);
  const names = new Map<string, string[]>();
  for (const o of owners) names.set(o.id, [...(names.get(o.id) ?? []), o.under]);
  return rows.map((l) => ({
    value: l.id,
    label: placeLabel(l),
    under: [],
    keywords: names.get(l.id)?.join(" "),
  }));
}

/** Each live location with the name of a live contact it is linked under, once per live link. */
async function locationOwners(tx: DbOrTx): Promise<{ id: string; under: string }[]> {
  const owner = alias(contacts, "owner");
  return tx
    .select({ id: contacts.id, under: owner.name })
    .from(contactLinks)
    .innerJoin(
      contacts,
      and(
        or(eq(contacts.id, contactLinks.linkedId), eq(contacts.id, contactLinks.contactId)),
        eq(contacts.type, "location"),
      ),
    )
    .innerJoin(
      owner,
      sql`${owner.id} = case when ${contactLinks.contactId} = ${contacts.id} then ${contactLinks.linkedId} else ${contactLinks.contactId} end`,
    )
    .where(and(isNull(contactLinks.archivedAt), isNull(owner.archivedAt)));
}

/** What a booking with this line starts with: its latest linked depot and terminal, if any. */
export async function lineDefaults(
  tx: DbOrTx,
  lineId: string | null,
): Promise<{ pickupDepotId: string | null; terminalId: string | null }> {
  if (!lineId) return { pickupDepotId: null, terminalId: null };
  const places = await rolePlaces(tx);
  return {
    pickupDepotId: defaultPlace(places.depots, lineId),
    terminalId: defaultPlace(places.terminals, lineId),
  };
}
