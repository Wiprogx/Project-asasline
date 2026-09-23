import "server-only";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import type { OpenInvoice } from "@/domain/matching";
import { openCents } from "@/domain/payments";
import type { DbOrTx } from "@/server/db/client";
import { invoices } from "@/server/db/schema";

/**
 * An invoice's money, read from the ledger each time — never a stored "paid" flag that could
 * drift: what posted payments settled, and what issued credit notes took.
 */
// Written with explicit table names: in a single-table select Drizzle drops the prefixes,
// and "id" / "amount_cents" then become ambiguous inside the subquery.
export const settledSql = sql<number>`coalesce((select sum(pa.amount_cents) from payment_allocations pa
  join payments p on p.id = pa.payment_id
  where pa.invoice_id = "invoices"."id" and p.status = 'posted'), 0)::int`;

export const creditedSql = sql<number>`coalesce((select sum(cn.gross_cents) from invoices cn
  where cn.credit_of_id = "invoices"."id" and cn.status = 'issued'), 0)::int`;

export async function invoiceMoney(db: DbOrTx, ids: string[]) {
  if (ids.length === 0) return new Map<string, { settled: number; credited: number }>();
  const rows = await db
    .select({ id: invoices.id, settled: settledSql, credited: creditedSql })
    .from(invoices)
    .where(inArray(invoices.id, ids));
  return new Map(rows.map((r) => [r.id, { settled: r.settled, credited: r.credited }]));
}

/** Issued customer invoices and supplier bills with something still open — what a bank line can settle. */
export async function openInvoices(db: DbOrTx): Promise<OpenInvoice[]> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      kind: invoices.kind,
      supplierRef: invoices.supplierRef,
      ogm: invoices.ogm,
      customerId: invoices.customerId,
      gross: invoices.grossCents,
      settled: settledSql,
      credited: creditedSql,
    })
    .from(invoices)
    .where(
      and(
        inArray(invoices.kind, ["invoice", "bill"]),
        eq(invoices.status, "issued"),
        gt(invoices.grossCents, 0),
      ),
    );
  return rows
    .map((r) => ({
      id: r.id,
      kind: r.kind as "invoice" | "bill",
      supplierRef: r.supplierRef,
      number: r.number ?? "",
      ogm: r.ogm,
      customerId: r.customerId,
      openCents: openCents(r.gross ?? 0, r.settled, r.credited),
    }))
    .filter((r) => r.openCents > 0);
}
