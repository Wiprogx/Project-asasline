import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { termGate, termIdFor } from "@/domain/accounting-settings";
import { openCents } from "@/domain/payments";
import { readPaymentTerms } from "@/server/accounting-config";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, invoices, quotations } from "@/server/db/schema";
import { invoiceMoney } from "./money";

/**
 * The payment term a shipment is under, when it is a condition (legacy termGate on the
 * Invoicing tab): which term, when the money is expected, and whether an invoice is still unpaid.
 */
export async function bookingTermGate(bookingId: string) {
  await requirePermission("app.accounting");
  if (!z.uuid().safeParse(bookingId).success) return null;
  const [row] = await db
    .select({ quotationTerm: quotations.paymentTermId, customerTerm: contacts.paymentTermId })
    .from(bookings)
    .innerJoin(contacts, eq(contacts.id, bookings.clientId))
    .leftJoin(quotations, eq(quotations.id, bookings.quotationId))
    .where(eq(bookings.id, bookingId));
  if (!row) return null;
  const id = termIdFor(row.quotationTerm, row.customerTerm);
  const term = (await readPaymentTerms()).find((t) => t.id === id);
  const when = term ? termGate(term.rule) : null;
  if (!term || !when) return null;
  const issued = await db
    .select({ id: invoices.id, gross: invoices.grossCents })
    .from(invoices)
    .where(
      and(
        eq(invoices.bookingId, bookingId),
        eq(invoices.kind, "invoice"),
        eq(invoices.status, "issued"),
      ),
    );
  const money = await invoiceMoney(
    db,
    issued.map((i) => i.id),
  );
  const unpaid = issued.some((i) => {
    const m = money.get(i.id);
    return openCents(i.gross ?? 0, m?.settled ?? 0, m?.credited ?? 0) > 0;
  });
  return { term: term.name, when, unpaid };
}
