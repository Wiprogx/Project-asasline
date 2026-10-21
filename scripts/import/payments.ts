/**
 * Legacy payments → payments and their allocations: the contact through its link (else its
 * name), each part through the imported invoice it settled. Posted or reversed as they stood;
 * the bank line they came from is linked by the bank lines' import.
 */
import { eq } from "drizzle-orm";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import { mapLegacyBankLine, mapLegacyPayment } from "../../src/domain/legacy-payments";
import type { DbOrTx } from "../../src/server/db/client";
import {
  bankLines,
  contacts,
  legacyLinks,
  paymentAllocations,
  payments,
} from "../../src/server/db/schema";
import { linksOf } from "./contacts";
import { emptyReport, type KindReport } from "./report";

export async function importPayments(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "payments");
  const contactLinks = await linksOf(tx, "contacts");
  const invoiceLinks = await linksOf(tx, "invoices");
  const named = new Map(
    (await tx.select({ id: contacts.id, name: contacts.name }).from(contacts)).map((c) => [
      c.name.trim().toLowerCase(),
      c.id,
    ]),
  );
  for (const rec of records.filter((r) => r.kind === "payments")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyPayment(rec.body);
    if ("skip" in m) {
      report.skipped.push(`payment ${rec.id}: ${m.skip}`);
      continue;
    }
    const label = m.payment.reference ?? `payment ${rec.id}`;
    const contactId =
      contactLinks.get(String(m.contact.legacyId ?? "")) ??
      (m.contact.name ? named.get(m.contact.name.toLowerCase()) : undefined) ??
      null;
    if (m.contact.legacyId !== null && !contactId)
      report.warnings.push(`${label}: its contact "${m.contact.name ?? "?"}" was not found`);
    const parts = m.allocs.map((a) => ({ ...a, invoiceId: invoiceLinks.get(a.legacyInvoiceId) }));
    const lost = parts.filter((a) => !a.invoiceId);
    if (lost.length) {
      report.skipped.push(
        `${label}: it settled invoice(s) ${lost.map((a) => a.legacyInvoiceId).join(", ")} that were not imported`,
      );
      continue;
    }
    const [row] = await tx
      .insert(payments)
      .values({ ...m.payment, contactId })
      .returning({ id: payments.id });
    if (parts.length)
      await tx
        .insert(paymentAllocations)
        .values(
          parts.map((a) => ({
            paymentId: row.id,
            invoiceId: a.invoiceId!,
            amountCents: a.amountCents,
          })),
        );
    report.added++;
    await tx.insert(legacyLinks).values({ kind: "payments", legacyId: rec.id, recordId: row.id });
    links.set(rec.id, row.id);
  }
  return report;
}

/**
 * Legacy statement lines → bank lines, each matched line pointing at its imported payment (and
 * the payment back at it). A line already in the app by its key is linked, not added twice.
 */
export async function importBankLines(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "bankLines");
  const paymentLinks = await linksOf(tx, "payments");
  for (const rec of records.filter((r) => r.kind === "bankLines")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const m = mapLegacyBankLine(rec.body, rec.id);
    if (!m) {
      report.skipped.push(`bank line ${rec.id}: no date`);
      continue;
    }
    const [known] = await tx
      .select({ id: bankLines.id })
      .from(bankLines)
      .where(eq(bankLines.dedupKey, m.line.dedupKey));
    let id = known?.id;
    if (id) report.matched++;
    else {
      const paymentId = m.legacyPaymentId ? (paymentLinks.get(m.legacyPaymentId) ?? null) : null;
      if (m.legacyPaymentId && !paymentId)
        report.warnings.push(
          `bank line ${rec.id}: its payment ${m.legacyPaymentId} was not imported — left open`,
        );
      [{ id }] = await tx
        .insert(bankLines)
        .values({
          ...m.line,
          paymentId,
          state: paymentId ? m.line.state : m.line.state === "matched" ? "open" : m.line.state,
        })
        .returning({ id: bankLines.id });
      if (paymentId)
        await tx.update(payments).set({ bankLineId: id }).where(eq(payments.id, paymentId));
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "bankLines", legacyId: rec.id, recordId: id! });
    links.set(rec.id, id!);
  }
  return report;
}
