import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cache } from "react";
import { z } from "zod";
import { billStatus, type InvoiceKind, remainingQty } from "@/domain/invoicing";
import { requirePermission } from "@/server/auth/dal";
import { readPaymentTerms } from "@/server/accounting-config";
import { db } from "@/server/db/client";
import {
  bankLines,
  bookings,
  contactBankAccounts,
  contacts,
  invoiceLines,
  invoices,
  paymentAllocations,
  payments,
  quotationLines,
  quotationRoutes,
} from "@/server/db/schema";
import { proposals } from "@/domain/matching";
import { creditedSql, invoiceMoney, openInvoices, settledSql } from "./money";

const isUuid = (id: string) => z.uuid().safeParse(id).success;
const original = alias(invoices, "original");

export async function listInvoices(opts: { status?: string; kind?: string; q?: string }) {
  await requirePermission("app.accounting");
  const where: (SQL | undefined)[] = [];
  if (opts.status) where.push(eq(invoices.status, opts.status as "draft"));
  if (opts.kind) where.push(eq(invoices.kind, opts.kind as InvoiceKind));
  if (opts.q) {
    const like = `%${opts.q}%`;
    where.push(
      or(ilike(invoices.number, like), ilike(contacts.name, like), ilike(bookings.ref, like)),
    );
  }
  return db
    .select({
      id: invoices.id,
      kind: invoices.kind,
      status: invoices.status,
      number: invoices.number,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      grossCents: invoices.grossCents,
      settled: settledSql,
      credited: creditedSql,
      customer: contacts.name,
      bookingRef: bookings.ref,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .leftJoin(bookings, eq(bookings.id, invoices.bookingId))
    .where(and(...where))
    .orderBy(sql`${invoices.number} desc nulls first`, desc(invoices.createdAt))
    .limit(500);
}

export type InvoiceRow = Awaited<ReturnType<typeof listInvoices>>[number];

/** One invoice with everything its screen and its print need. */
export const getInvoice = cache(async (id: string) => {
  await requirePermission("app.accounting");
  if (!isUuid(id)) return null;
  const [head] = await db
    .select({
      invoice: invoices,
      customer: contacts,
      bookingRef: bookings.ref,
      creditOfNumber: original.number,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .leftJoin(bookings, eq(bookings.id, invoices.bookingId))
    .leftJoin(original, eq(original.id, invoices.creditOfId))
    .where(eq(invoices.id, id));
  if (!head) return null;
  const [lines, credits] = await Promise.all([
    db
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, id), isNull(invoiceLines.archivedAt)))
      .orderBy(asc(invoiceLines.position)),
    db
      .select({ id: invoices.id, number: invoices.number, status: invoices.status })
      .from(invoices)
      .where(eq(invoices.creditOfId, id)),
  ]);
  return { ...head, lines, credits };
});

/**
 * A booking's billing: what it can be invoiced for (its quotation's lines), what issued
 * invoices and credit notes already took per line, who may be invoiced, and its status.
 */
export async function bookingBilling(bookingId: string) {
  await requirePermission("app.accounting");
  if (!isUuid(bookingId)) return null;
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) return null;

  const source = b.quotationId
    ? await db
        .select({ line: quotationLines })
        .from(quotationLines)
        .innerJoin(quotationRoutes, eq(quotationRoutes.id, quotationLines.routeId))
        .where(
          and(
            eq(quotationRoutes.quotationId, b.quotationId),
            eq(quotationRoutes.declined, false),
            isNull(quotationLines.archivedAt),
          ),
        )
        .orderBy(asc(quotationRoutes.position), asc(quotationLines.position))
    : [];

  const billed = await db
    .select({
      key: invoiceLines.sourceKey,
      qty: invoiceLines.qty,
      kind: invoices.kind,
      unit: invoiceLines.unitCents,
    })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(
      and(
        eq(invoices.bookingId, bookingId),
        eq(invoices.status, "issued"),
        isNull(invoiceLines.archivedAt),
      ),
    );

  const lines = source
    .filter(({ line }) => (line.sellCents ?? 0) > 0)
    .map(({ line }) => {
      const key = `q:${line.id}`;
      return {
        key,
        description: line.description,
        qty: line.qty,
        unitCents: line.sellCents ?? 0,
        vatCode: line.vatCode,
        remaining: remainingQty(
          line.qty,
          billed.filter((x) => x.key === key),
        ),
      };
    });

  const total = lines.reduce((s, l) => s + l.qty * l.unitCents, 0);
  // Only lines that bill a quotation line count against its total; extras added by hand
  // (an admin fee) are on top and must not read as over-invoicing.
  const done = billed
    .filter((x) => x.key?.startsWith("q:"))
    .reduce((s, x) => s + (x.kind === "credit" ? -1 : 1) * x.qty * x.unit, 0);
  const partyIds = [
    ...new Set(
      [b.clientId, b.payerId, b.shipperId, b.consigneeId, b.notifyId].filter(
        (x): x is string => !!x,
      ),
    ),
  ];
  const parties = partyIds.length
    ? await db
        .select({ id: contacts.id, name: contacts.name })
        .from(contacts)
        .where(inArray(contacts.id, partyIds))
    : [];
  const list = await db
    .select({
      id: invoices.id,
      kind: invoices.kind,
      status: invoices.status,
      number: invoices.number,
      grossCents: invoices.grossCents,
      customer: contacts.name,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .where(eq(invoices.bookingId, bookingId))
    .orderBy(desc(invoices.createdAt));

  return {
    booking: b,
    lines,
    totalCents: total,
    billedCents: done,
    status: billStatus(total, done),
    parties,
    invoices: list,
  };
}

export async function paymentTerms() {
  await requirePermission("app.accounting");
  return readPaymentTerms();
}

/** IBAN → the contact it belongs to (contact bank accounts), for the bank matcher. */
export async function contactOfIbanLookup() {
  await requirePermission("app.accounting");
  const rows = await db
    .select({ iban: contactBankAccounts.iban, contactId: contactBankAccounts.contactId })
    .from(contactBankAccounts)
    .where(isNull(contactBankAccounts.archivedAt));
  const byIban = new Map(rows.map((r) => [r.iban.replace(/\s/g, "").toUpperCase(), r.contactId]));
  return (iban: string) => byIban.get(iban.replace(/\s/g, "").toUpperCase()) ?? null;
}

/** An invoice's payments, newest first, with reversals kept in view. */
export async function paymentsOfInvoice(invoiceId: string) {
  await requirePermission("app.accounting");
  if (!isUuid(invoiceId)) return [];
  return db
    .select({ payment: payments, settled: paymentAllocations.amountCents })
    .from(paymentAllocations)
    .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
    .where(eq(paymentAllocations.invoiceId, invoiceId))
    .orderBy(desc(payments.date), desc(payments.createdAt));
}

export async function listPayments() {
  await requirePermission("app.accounting");
  return db
    .select({
      payment: payments,
      customer: contacts.name,
      invoiceId: invoices.id,
      invoiceNumber: invoices.number,
    })
    .from(payments)
    .leftJoin(contacts, eq(contacts.id, payments.contactId))
    .leftJoin(paymentAllocations, eq(paymentAllocations.paymentId, payments.id))
    .leftJoin(invoices, eq(invoices.id, paymentAllocations.invoiceId))
    .orderBy(desc(payments.date), desc(payments.createdAt))
    .limit(500);
}

/** Statement lines, open ones first, each open line with what it probably pays. */
export async function bankLinesWithProposals() {
  await requirePermission("app.accounting");
  const [lines, open, ibanOf] = await Promise.all([
    db
      .select()
      .from(bankLines)
      .where(isNull(bankLines.archivedAt))
      .orderBy(sql`case ${bankLines.state} when 'open' then 0 else 1 end`, desc(bankLines.date))
      .limit(500),
    openInvoices(db),
    contactOfIbanLookup(),
  ]);
  const numberOf = new Map(open.map((i) => [i.id, i]));
  return lines.map((l) => ({
    line: l,
    proposals:
      l.state === "open"
        ? proposals(
            {
              amountCents: l.amountCents,
              comm: l.comm ?? "",
              ogm: l.ogm ?? "",
              name: l.name ?? "",
              iban: l.iban ?? "",
            },
            open,
            ibanOf,
          ).map((p) => ({
            ...p,
            number: numberOf.get(p.invoiceId)?.number ?? "",
            openCents: numberOf.get(p.invoiceId)?.openCents ?? 0,
          }))
        : [],
  }));
}

/** What payments settled and credit notes took on one invoice. */
export async function invoiceSettlement(invoiceId: string) {
  await requirePermission("app.accounting");
  if (!isUuid(invoiceId)) return { settled: 0, credited: 0 };
  return (await invoiceMoney(db, [invoiceId])).get(invoiceId) ?? { settled: 0, credited: 0 };
}
