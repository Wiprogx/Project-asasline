/**
 * Legacy invoices → invoices, credit notes and supplier bills, with their lines and stored
 * totals. A sales number is kept as issued; an issued bill takes its BILL number from the
 * sequence. A line of a booking's invoice that billed a catalogue item names the quotation line
 * it came from (`q:<line>`), so the booking reads as invoiced. Credit notes follow their
 * invoices; their lines name the invoice line they give back.
 */
import { and, eq, isNull } from "drizzle-orm";
import { DEFAULT_PAYMENT_TERMS } from "../../src/domain/accounting";
import { euroTotals } from "../../src/domain/fx";
import { dueDateOf, invoiceTotals } from "../../src/domain/invoicing";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapLegacyInvoice } from "../../src/domain/legacy-invoices";
import type { DbOrTx, Tx } from "../../src/server/db/client";
import {
  bookings,
  configTables,
  contacts,
  invoiceLines,
  invoices,
  legacyLinks,
  quotationLines,
} from "../../src/server/db/schema";
import { nextInvoiceNumber } from "../../src/server/sequences";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

type Term = { id: string; rule: string; days?: number };

async function termsOf(tx: DbOrTx): Promise<Term[]> {
  const [row] = await tx.select().from(configTables).where(eq(configTables.name, "paymentTerms"));
  return Array.isArray(row?.value) ? (row.value as Term[]) : [...DEFAULT_PAYMENT_TERMS];
}

/** The booking's quotation lines by catalogue item, for the `q:<line>` key. */
async function quotedLines(tx: DbOrTx, bookingId: string) {
  const [b] = await tx
    .select({ routeId: bookings.quotationRouteId })
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!b?.routeId) return [];
  return tx
    .select({ id: quotationLines.id, itemId: quotationLines.itemId })
    .from(quotationLines)
    .where(and(eq(quotationLines.routeId, b.routeId), isNull(quotationLines.archivedAt)));
}

export async function importInvoices(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "invoices");
  const contactLinks = await linksOf(tx, "contacts");
  const bookingLinks = await linksOf(tx, "bookings");
  const itemLinks = await linksOf(tx, "RATE_ITEMS");
  const terms = await termsOf(tx);
  const named = new Map(
    (await tx.select({ id: contacts.id, name: contacts.name }).from(contacts)).map((c) => [
      c.name.trim().toLowerCase(),
      c.id,
    ]),
  );
  // Invoices before the credit notes that point at them.
  const docs = records
    .filter((r) => r.kind === "invoices")
    .sort((a, b) => Number(a.body.kind === "credit") - Number(b.body.kind === "credit"));
  for (const rec of docs) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyInvoice(rec.body);
    if ("skip" in m) {
      report.skipped.push(`invoice ${rec.id}: ${m.skip}`);
      continue;
    }
    const label = m.doc.number ?? m.doc.supplierRef ?? `invoice ${rec.id}`;
    const customerId =
      contactLinks.get(String(m.customer.legacyId ?? "")) ??
      named.get((m.customer.name ?? "").toLowerCase());
    if (!customerId) {
      report.skipped.push(`${label}: "${m.customer.name ?? "?"}" is not a contact`);
      continue;
    }
    for (const w of m.warnings) report.warnings.push(`${label}: ${w}`);
    if (m.doc.number) {
      const [known] = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.number, m.doc.number));
      if (known) {
        report.matched++;
        await tx
          .insert(legacyLinks)
          .values({ kind: "invoices", legacyId: rec.id, recordId: known.id });
        links.set(rec.id, known.id);
        continue;
      }
    }
    const bookingId = m.bookingLegacyId ? (bookingLinks.get(m.bookingLegacyId) ?? null) : null;
    const creditOfId = m.creditOfLegacyId ? (links.get(m.creditOfLegacyId) ?? null) : null;
    if (m.creditOfLegacyId && !creditOfId)
      report.warnings.push(
        `${label}: the invoice it credits (${m.creditOfLegacyId}) was not imported`,
      );
    const issue = m.doc.issueDate;
    const term = terms.find((t) => t.id === m.doc.paymentTermId) ?? null;
    const number =
      m.doc.kind === "bill" && m.doc.status === "issued"
        ? await nextInvoiceNumber(tx as Tx, "bill", issue ?? new Date().toISOString().slice(0, 10))
        : m.doc.number;
    const t = euroTotals(invoiceTotals(m.lines), m.doc.fxBp);
    const [doc] = await tx
      .insert(invoices)
      .values({
        ...m.doc,
        number,
        customerId,
        bookingId,
        creditOfId,
        dueDate: issue ? dueDateOf(issue, term) : null,
        ...(m.doc.status === "draft" ? {} : t),
        ...(rec.archived
          ? { archivedAt: new Date(), archivedReason: "Archived in the legacy office" }
          : {}),
      })
      .returning({ id: invoices.id });
    const quoted = bookingId && m.doc.kind !== "bill" ? await quotedLines(tx, bookingId) : [];
    const used = new Set<string>();
    const origLines = creditOfId
      ? await tx
          .select({ id: invoiceLines.id, position: invoiceLines.position })
          .from(invoiceLines)
          .where(eq(invoiceLines.invoiceId, creditOfId))
      : [];
    if (m.lines.length)
      await tx.insert(invoiceLines).values(
        m.lines.map((l) => {
          const item = l.legacyItemId ? itemLinks.get(l.legacyItemId) : undefined;
          const q = item ? quoted.find((x) => x.itemId === item && !used.has(x.id)) : undefined;
          if (q) used.add(q.id);
          return {
            invoiceId: doc.id,
            position: l.position,
            sourceKey: q ? `q:${q.id}` : null,
            description: l.description,
            qty: l.qty,
            unitCents: l.unitCents,
            vatCode: l.vatCode,
            account: l.account,
            creditOfLineId: origLines.find((o) => o.position === l.creditOfPosition)?.id ?? null,
          };
        }),
      );
    report.added++;
    await tx.insert(legacyLinks).values({ kind: "invoices", legacyId: rec.id, recordId: doc.id });
    links.set(rec.id, doc.id);
  }
  return report;
}
