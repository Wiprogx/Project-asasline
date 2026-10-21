import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { leftToCredit } from "@/domain/credit-lines";
import type { Tx } from "@/server/db/client";
import { invoiceLines, invoices } from "@/server/db/schema";
import { nextInvoiceNumber } from "@/server/sequences";
import { liveLines, storeTotals } from "./invoice-store";

// Internal to the credit actions: they call these after their permission check.

type Invoice = typeof invoices.$inferSelect;
type Line = typeof invoiceLines.$inferSelect;

/** Each line of the invoice with how much of it is still to be credited. */
export async function creditableLines(tx: Tx, invoiceId: string) {
  const lines = await liveLines(tx, invoiceId);
  const credited = await tx
    .select({ creditOfLineId: invoiceLines.creditOfLineId, qty: invoiceLines.qty })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(
      and(
        eq(invoices.creditOfId, invoiceId),
        eq(invoices.status, "issued"),
        isNull(invoiceLines.archivedAt),
      ),
    );
  const left = leftToCredit(lines, credited);
  return lines.map((line) => ({ line, left: left[line.id] ?? 0 }));
}

/**
 * The credit note itself, issued at once in its own series (legacy issueCredit): each line
 * gives back the quantity asked of the invoice line it names.
 */
export async function issueCreditNote(
  tx: Tx,
  p: {
    orig: Invoice;
    give: { line: Line; qty: number }[];
    reason: string;
    userId: string;
    today: string;
  },
) {
  const number = await nextInvoiceNumber(tx, "credit", p.today);
  const [cn] = await tx
    .insert(invoices)
    .values({
      customerId: p.orig.customerId,
      bookingId: p.orig.bookingId,
      kind: "credit",
      status: "issued",
      number,
      creditOfId: p.orig.id,
      reason: p.reason,
      issueDate: p.today,
      dueDate: p.today,
      createdBy: p.userId,
      updatedBy: p.userId,
    })
    .returning({ id: invoices.id });
  await tx.insert(invoiceLines).values(
    p.give.map(({ line: l, qty }, i) => ({
      invoiceId: cn.id,
      position: i,
      sourceKey: l.sourceKey,
      description: l.description,
      qty,
      unitCents: l.unitCents,
      vatCode: l.vatCode,
      account: l.account,
      creditOfLineId: l.id,
      createdBy: p.userId,
    })),
  );
  await storeTotals(tx, cn.id);
  return { id: cn.id, number };
}
