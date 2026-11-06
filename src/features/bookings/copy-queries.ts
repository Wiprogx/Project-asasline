import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { CopyPrice } from "@/domain/booking-doc";
import { requirePermission } from "@/server/auth/dal";
import { readPaymentTerms } from "@/server/accounting-config";
import { db } from "@/server/db/client";
import { contacts, quotationLines, quotationRoutes, quotations } from "@/server/db/schema";
import { getBooking } from "./queries";
import { readHsCodes } from "@/server/goods-config";
import { hsDescription } from "@/domain/goods";
import { readContainerSpecs } from "@/server/container-config";
import { cityNameOf } from "@/server/city-sql";
import { specsByType } from "@/domain/lookups";
import { scheduleConflict } from "@/domain/vessels";
import { addressBlocksOf, addressOf } from "@/server/addresses";
import { readLoadingModes } from "@/server/loading-config";

type CopyPlaces = {
  pickupDepotId: string | null;
  pickupDepot: string | null;
  terminalId: string | null;
  terminal: string | null;
  loadAddressId: string | null;
  loadAddress: string | null;
  containers: readonly { loadAddressId: string | null }[];
};

/**
 * The places of the copy, written as the driver needs them: the depot the empties are collected
 * at and the terminal the full box goes to as "Name, street, city"; the loading address of the
 * booking and of each box as a block — name, street, city, phone on lines of their own. A
 * booking from before keeps the words it carried.
 */
async function placesOf(b: CopyPlaces) {
  const blocks = await addressBlocksOf(db, [
    b.loadAddressId,
    ...b.containers.map((c) => c.loadAddressId),
  ]);
  const loadAddress = (id: string | null) => (id ? (blocks.get(id) ?? null) : null);
  return {
    booking: {
      pickupDepot: (await addressOf(db, b.pickupDepotId)) ?? b.pickupDepot,
      terminal: (await addressOf(db, b.terminalId)) ?? b.terminal,
      loadAddress: loadAddress(b.loadAddressId) ?? b.loadAddress,
    },
    loadAddress,
  };
}

/**
 * What a printed copy of the booking needs: the booking with its boxes, the customer as it
 * is written on paper, and — for the customer copy — the price of its destination on the
 * quotation, shown the way the quotation chose (one source of truth, invariant 2).
 */
export async function bookingCopy(id: string) {
  await requirePermission("app.bookings");
  const booking = await getBooking(id);
  if (!booking) return null;
  // The truckers of the boxes, by name: the copy prints who collects which box.
  const truckerIds = [
    ...new Set(booking.containers.map((c) => c.transporterId).filter((x): x is string => !!x)),
  ];
  const truckers = truckerIds.length
    ? await db
        .select({ id: contacts.id, name: contacts.name })
        .from(contacts)
        .where(inArray(contacts.id, truckerIds))
    : [];
  const nameOf = new Map(truckers.map((t) => [t.id, t.name]));
  const places = await placesOf(booking);
  const hs = await readHsCodes();
  const b = {
    ...booking,
    ...places.booking,
    containers: booking.containers.map((c) => ({
      ...c,
      loadAddress: places.loadAddress(c.loadAddressId) ?? c.loadAddress,
      transporter: c.transporterId ? (nameOf.get(c.transporterId) ?? null) : null,
      hsLines: c.hsLines.map((l) => ({ ...l, description: hsDescription(hs, l.code) })),
    })),
  };
  const [client] = await db
    .select({
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: cityNameOf(contacts.cityId),
      vat: contacts.vat,
      eori: contacts.eori,
      phone: contacts.phone,
      email: contacts.email,
      paymentTermId: contacts.paymentTermId,
    })
    .from(contacts)
    .where(eq(contacts.id, b.clientId));
  let price: CopyPrice | null = null;
  if (b.quotationId && b.quotationRouteId) {
    const [q] = await db
      .select({
        display: quotations.display,
        validUntil: quotations.validUntil,
        paymentTermId: quotations.paymentTermId,
        boxes: quotationRoutes.boxes,
      })
      .from(quotations)
      .innerJoin(quotationRoutes, eq(quotationRoutes.id, b.quotationRouteId))
      .where(eq(quotations.id, b.quotationId));
    const lines = await db
      .select()
      .from(quotationLines)
      .where(and(eq(quotationLines.routeId, b.quotationRouteId), isNull(quotationLines.archivedAt)))
      .orderBy(asc(quotationLines.position), asc(quotationLines.createdAt));
    const termId = q?.paymentTermId ?? client?.paymentTermId ?? null;
    const term = termId ? (await readPaymentTerms()).find((t) => t.id === termId) : null;
    if (q)
      price = {
        display: q.display,
        validUntil: q.validUntil,
        paymentTerm: term?.name ?? null,
        boxes: q.boxes,
        lines: lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          sellCents: l.sellCents,
          vatCode: l.vatCode,
          listed: l.listed,
          perBox: l.perBox,
          condition: l.condition,
        })),
      };
  }
  return {
    booking: b,
    client: client ?? null,
    price,
    specs: specsByType(await readContainerSpecs()),
    /** Which modes are a drop: the copies then say "Delivered on" and "Picked back on". */
    loadingModes: await readLoadingModes(),
    /** Why the copy may not go out: a date typed over the sailing's (legacy scheduleConflict). */
    blocked: scheduleConflict(b, b.vessel),
  };
}
