import "server-only";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, rateItems, vessels } from "@/server/db/schema";
import { readFileHintsForEdit } from "@/server/file-config";
import { readPermissionsForEdit } from "@/server/permission-config";
import { readPortsForEdit } from "@/server/port-config";

export async function portsForEdit() {
  await requirePermission("app.settings");
  return readPortsForEdit();
}

export async function fileHintsForEdit() {
  await requirePermission("app.settings");
  return readFileHintsForEdit();
}

export async function permissionsForEdit() {
  await requirePermission("app.settings");
  return readPermissionsForEdit();
}

/**
 * The links report (legacy vLinksCard). Parties are contacts by id here (a name typed as text
 * cannot happen) and an invoice goes only to a party on the shipment (guard 10.3), so what is
 * left to report is what still lives as text or is missing: shipping lines with no contact of
 * their name, bookings with no quotation behind their price, customers shipping without a
 * VAT number.
 */
export async function linksReport() {
  await requirePermission("app.settings");
  const names = new Set(
    (
      await db.select({ name: contacts.name }).from(contacts).where(isNull(contacts.archivedAt))
    ).map((c) => c.name.trim().toLowerCase()),
  );
  const [onSailings, onLegs] = await Promise.all([
    db
      .selectDistinct({ carrier: vessels.carrier })
      .from(vessels)
      .where(and(isNull(vessels.archivedAt), sql`${vessels.carrier} is not null`)),
    db
      .selectDistinct({ carrier: rateItems.carrier })
      .from(rateItems)
      .where(and(isNull(rateItems.archivedAt), eq(rateItems.category, "ocean"))),
  ]);
  const carriers = [
    ...new Set([...onSailings, ...onLegs].map((r) => r.carrier?.trim()).filter(Boolean)),
  ]
    .sort()
    .map((name) => ({ name: name!, linked: names.has(name!.toLowerCase()) }));

  const unpriced = await db
    .select({ id: bookings.id, ref: bookings.ref, client: contacts.name })
    .from(bookings)
    .innerJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(
      and(
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
        isNull(bookings.quotationRouteId),
      ),
    )
    .orderBy(bookings.ref)
    .limit(100);

  const noVat = await db
    .selectDistinct({ id: contacts.id, name: contacts.name, country: contacts.country })
    .from(bookings)
    .innerJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(and(ne(bookings.status, "cancelled"), isNull(bookings.archivedAt), isNull(contacts.vat)))
    .orderBy(contacts.name)
    .limit(100);

  return { carriers, unpriced, noVat };
}
