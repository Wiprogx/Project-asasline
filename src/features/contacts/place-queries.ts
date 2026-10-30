import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { DELIVERY_ROLE } from "@/domain/lookup-tables";
import { requirePermission } from "@/server/auth/dal";
import { cityNameOf } from "@/server/city-sql";
import { db } from "@/server/db/client";
import { contactLinks, contacts, locationRoles } from "@/server/db/schema";

export type Place = { value: string; label: string; delivery: boolean };

const where = (c: { street: string | null; zip: string | null; city: string | null }) =>
  [c.street, [c.zip, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/**
 * Where a customer's box can be loaded (legacy loadAddrsOf): its delivery addresses first, the
 * most recently linked first — the default — then its other linked locations, then its own
 * address. Live links to live contacts only.
 */
export async function placesOf(contactId: string): Promise<Place[]> {
  await requirePermission("app.contacts");
  const linked = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
      role: locationRoles.label,
      delivery: sql<boolean>`coalesce(${locationRoles.code} = ${DELIVERY_ROLE}, false)`,
      at: contactLinks.createdAt,
    })
    .from(contactLinks)
    .innerJoin(
      contacts,
      or(
        and(eq(contactLinks.contactId, contactId), eq(contacts.id, contactLinks.linkedId)),
        and(eq(contactLinks.linkedId, contactId), eq(contacts.id, contactLinks.contactId)),
      ),
    )
    .leftJoin(locationRoles, eq(locationRoles.id, contactLinks.locationRoleId))
    .where(
      and(
        isNull(contactLinks.archivedAt),
        isNull(contacts.archivedAt),
        eq(contacts.type, "location"),
      ),
    )
    .orderBy(
      desc(sql`coalesce(${locationRoles.code} = ${DELIVERY_ROLE}, false)`),
      desc(contactLinks.createdAt),
    );
  const [own] = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
    })
    .from(contacts)
    .where(eq(contacts.id, contactId));
  const places = linked.map((p) => ({
    value: p.id,
    label: `${p.name}${p.role ? ` (${p.role})` : ""}${where(p) ? ` — ${where(p)}` : ""}`,
    delivery: p.delivery,
  }));
  if (own?.street)
    places.push({ value: own.id, label: `${own.name} — ${where(own)}`, delivery: false });
  return places;
}
