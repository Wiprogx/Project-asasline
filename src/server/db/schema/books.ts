import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { cents, recordColumns } from "./_columns";

/**
 * A VAT return marked as filed: the grids exactly as they were sent (cents per grid), so a
 * later question is answered from what was filed, not from a recomputation. Filing closes the
 * books through the period's last day.
 */
export const vatFilings = pgTable(
  "vat_filings",
  {
    ...recordColumns,
    period: text().notNull(),
    grids: jsonb().$type<Record<string, number>>().notNull(),
    balanceCents: cents().notNull(),
    filedBy: uuid().notNull(),
    filedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("vat_filings_period_uq").on(t.period)],
);
