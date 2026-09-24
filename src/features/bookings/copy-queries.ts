import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { CopyPrice } from "@/domain/booking-doc";
import { requirePermission } from "@/server/auth/dal";
import { readPaymentTerms } from "@/server/accounting-config";
import { db } from "@/server/db/client";
import { contacts, quotationLines, quotations } from "@/server/db/schema";
import { getBooking } from "./queries";

/**
 * What a printed copy of the booking needs: the booking with its boxes, the customer as it
 * is written on paper, and — for the customer copy — the price of its destination on the
 * quotation, shown the way the quotation chose (one source of truth, invariant 2).
 */
export async function bookingCopy(id: string) {
  await requirePermission("app.bookings");
  const b = await getBooking(id);
  if (!b) return null;
  const [client] = await db
    .select({
      name: contacts.name,
      street: contacts.street,
      zip: contacts.zip,
      city: contacts.city,
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
      })
      .from(quotations)
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
        lines: lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          sellCents: l.sellCents,
          vatCode: l.vatCode,
          listed: l.listed,
        })),
      };
  }
  return { booking: b, client: client ?? null, price };
}
