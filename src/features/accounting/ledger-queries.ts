import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { agedBalance, journal, type LedgerPayment } from "@/domain/ledger";
import { openCents } from "@/domain/payments";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, invoices, paymentAllocations, payments } from "@/server/db/schema";
import { issuedDocs } from "./ledger-store";
import { creditedSql, settledSql } from "./money";

/** The journal, derived from the documents and payments each time it is read (see domain/ledger). */
export const readJournal = cache(async () => {
  await requirePermission("app.accounting");
  const [docs, pays] = await Promise.all([
    issuedDocs(),
    db
      .select({
        id: payments.id,
        direction: payments.direction,
        date: payments.date,
        amountCents: payments.amountCents,
        diffCents: payments.diffCents,
        diffAccount: payments.diffAccount,
        partner: contacts.name,
        reference: payments.reference,
        invoiceNumber: invoices.number,
        status: payments.status,
        reversedOn: payments.reversedOn,
      })
      .from(payments)
      .leftJoin(contacts, eq(contacts.id, payments.contactId))
      .leftJoin(paymentAllocations, eq(paymentAllocations.paymentId, payments.id))
      .leftJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId)),
  ]);
  const ledgerPays: LedgerPayment[] = pays.map((p) => ({
    ...p,
    reversedOn: p.status === "reversed" ? (p.reversedOn ?? p.date) : null,
  }));
  return journal(docs, ledgerPays);
});

/** What customers owe (receivables) or what is owed to suppliers (payables), by age. */
export async function agedReport(side: "receivables" | "payables", today: string) {
  await requirePermission("app.accounting");
  const rows = await db
    .select({
      partner: contacts.name,
      dueDate: invoices.dueDate,
      gross: invoices.grossCents,
      settled: settledSql,
      credited: creditedSql,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .where(
      and(
        eq(invoices.kind, side === "receivables" ? "invoice" : "bill"),
        eq(invoices.status, "issued"),
      ),
    );
  const open = rows
    .map((r) => ({ ...r, openCents: openCents(r.gross ?? 0, r.settled, r.credited) }))
    .filter((r) => r.openCents > 0);
  return agedBalance(open, today);
}

/**
 * What each shipment earned in a period: its invoices less its credit notes (net of VAT),
 * against the supplier bills recorded on it. Dated by the documents, not by the booking.
 */
export async function profitPerShipment(from: string, to: string) {
  await requirePermission("app.accounting");
  const signed = sql<number>`sum(case ${invoices.kind}
    when 'invoice' then ${invoices.netCents} when 'credit' then -${invoices.netCents} else 0 end)::int`;
  const cost = sql<number>`sum(case when ${invoices.kind} = 'bill' then ${invoices.netCents} else 0 end)::int`;
  const rows = await db
    .select({
      bookingId: bookings.id,
      ref: bookings.ref,
      customer: contacts.name,
      revenueCents: signed,
      costCents: cost,
    })
    .from(invoices)
    .innerJoin(bookings, eq(bookings.id, invoices.bookingId))
    .leftJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(
      and(
        eq(invoices.status, "issued"),
        inArray(invoices.kind, ["invoice", "credit", "bill"]),
        sql`${invoices.issueDate} between ${from} and ${to}`,
      ),
    )
    .groupBy(bookings.id, bookings.ref, contacts.name)
    .orderBy(bookings.ref);
  return rows.map((r) => ({ ...r, marginCents: r.revenueCents - r.costCents }));
}
