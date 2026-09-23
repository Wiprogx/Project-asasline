import "server-only";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { contacts, invoiceLines, invoices } from "@/server/db/schema";

// Internal: callers check the permission (the reports) or run inside a guarded action (filing).
/**
 * Every issued document with its live lines, its partner's name and country. Only what has a
 * number counts: drafts and discarded drafts are not in the books.
 */
export async function issuedDocs(range?: { from: string; to: string }) {
  const inRange = range
    ? sql`${invoices.issueDate} between ${range.from} and ${range.to}`
    : undefined;
  const issued = and(eq(invoices.status, "issued"), isNotNull(invoices.number), inRange);
  const [docs, lines] = await Promise.all([
    db
      .select({
        id: invoices.id,
        kind: invoices.kind,
        number: invoices.number,
        date: invoices.issueDate,
        partner: contacts.name,
        country: contacts.country,
        partnerId: invoices.customerId,
        vat: contacts.vat,
      })
      .from(invoices)
      .innerJoin(contacts, eq(contacts.id, invoices.customerId))
      .where(issued),
    db
      .select({
        invoiceId: invoiceLines.invoiceId,
        qty: invoiceLines.qty,
        unitCents: invoiceLines.unitCents,
        vatCode: invoiceLines.vatCode,
        account: invoiceLines.account,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(and(issued, isNull(invoiceLines.archivedAt))),
  ]);
  const linesOf = Map.groupBy(lines, (l) => l.invoiceId);
  return docs.map((d) => ({
    id: d.id,
    side: d.kind === "bill" ? ("purchase" as const) : ("sale" as const),
    credit: d.kind === "credit",
    number: d.number ?? "",
    date: d.date ?? "",
    partner: d.partner,
    partnerCountry: d.country,
    partnerId: d.partnerId,
    partnerVat: d.vat,
    lines: linesOf.get(d.id) ?? [],
  }));
}
