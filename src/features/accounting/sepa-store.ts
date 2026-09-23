import "server-only";
import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { payProblem } from "@/domain/accounting";
import { openCents } from "@/domain/payments";
import { sepaProblem } from "@/domain/sepa";
import type { DbOrTx } from "@/server/db/client";
import { contactBankAccounts, contacts, invoices } from "@/server/db/schema";
import { creditedSql, settledSql } from "./money";

// Internal: read by the SEPA screen (permission-checked) and by the file action, under lock.

/** A bill already in a SEPA file that was not cancelled is not offered again. */
const inLiveBatchSql = sql<boolean>`exists (select 1 from sepa_batch_items i
  join sepa_batches b on b.id = i.batch_id
  where i.invoice_id = "invoices"."id" and b.archived_at is null and i.archived_at is null)`;

/** Recorded bills still open, with the supplier's IBAN and what (if anything) stops paying them. */
export async function payableBills(db: DbOrTx, ids?: string[]) {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      supplierRef: invoices.supplierRef,
      dueDate: invoices.dueDate,
      gross: invoices.grossCents,
      approvedAt: invoices.approvedAt,
      settled: settledSql,
      credited: creditedSql,
      inBatch: inLiveBatchSql,
      supplier: contacts.name,
      supplierId: contacts.id,
    })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .where(
      and(
        eq(invoices.kind, "bill"),
        eq(invoices.status, "issued"),
        gt(invoices.grossCents, 0),
        ids ? inArray(invoices.id, ids) : undefined,
      ),
    )
    .orderBy(asc(invoices.dueDate));
  const supplierIds = [...new Set(rows.map((r) => r.supplierId))];
  const accounts = supplierIds.length
    ? await db
        .select()
        .from(contactBankAccounts)
        .where(
          and(
            inArray(contactBankAccounts.contactId, supplierIds),
            isNull(contactBankAccounts.archivedAt),
          ),
        )
        .orderBy(asc(contactBankAccounts.createdAt))
    : [];
  return rows
    .map((r) => {
      const open = openCents(r.gross ?? 0, r.settled, r.credited);
      const account = accounts.find((a) => a.contactId === r.supplierId) ?? null;
      const problem =
        (r.inBatch ? "Already in a SEPA file" : null) ??
        payProblem({ grossCents: r.gross ?? 0, approvedAt: r.approvedAt }) ??
        sepaProblem({ iban: account?.iban ?? null, amountCents: open });
      return {
        ...r,
        openCents: open,
        iban: account?.iban ?? null,
        bic: account?.bic ?? null,
        problem,
      };
    })
    .filter((r) => r.openCents > 0);
}
