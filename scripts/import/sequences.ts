/**
 * The counters after the import (docs/MIGRATION.md, step 3): each QT/SB month and each
 * INV/CN/BILL year set to the highest number now in use, so the next number continues the
 * series. A counter only ever goes up — one already past the imported numbers is left alone.
 */
import { isNotNull, sql } from "drizzle-orm";
import { seriesOf } from "../../src/domain/odoo";
import { refFloors } from "../../src/domain/refs";
import type { DbOrTx } from "../../src/server/db/client";
import { bookings, invoices, quotations, sequences } from "../../src/server/db/schema";
import { emptyReport, type KindReport } from "./report";

export async function raiseSequences(tx: DbOrTx): Promise<KindReport> {
  const report = emptyReport();
  const [qs, bs, is] = await Promise.all([
    tx.select({ ref: quotations.ref }).from(quotations),
    tx.select({ ref: bookings.ref }).from(bookings),
    tx.select({ n: invoices.number }).from(invoices).where(isNotNull(invoices.number)),
  ]);
  const floors = refFloors([...qs.map((q) => q.ref), ...bs.map((b) => b.ref)]);
  for (const { n } of is) {
    const s = n ? seriesOf(n) : null;
    if (s) floors[s.key] = Math.max(floors[s.key] ?? 0, s.n);
  }
  for (const [key, value] of Object.entries(floors)) {
    const [row] = await tx
      .insert(sequences)
      .values({ key, value })
      .onConflictDoUpdate({
        target: sequences.key,
        set: { value: sql`greatest(${sequences.value}, ${value})` },
      })
      .returning({ value: sequences.value });
    if (row.value === value) report.added++;
    else report.already++;
  }
  return report;
}
