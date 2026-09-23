import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { cents, recordColumns } from "./_columns";
import { invoices } from "./invoices";
import { messages } from "./messages";

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

/** A reminder written for an overdue invoice: its step, the day, and the message it went out as. */
export const invoiceReminders = pgTable(
  "invoice_reminders",
  {
    ...recordColumns,
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id),
    level: integer().notNull(),
    sentOn: date({ mode: "string" }).notNull(),
    messageId: uuid().references(() => messages.id),
  },
  (t) => [index("invoice_reminders_invoice_idx").on(t.invoiceId, t.sentOn)],
);

/**
 * Equipment bought on a bill line of class 2, depreciated month by month (domain/assets). The
 * depreciation is never stored: the journal derives it from these rows, like everything else.
 */
export const fixedAssets = pgTable(
  "fixed_assets",
  {
    ...recordColumns,
    name: text().notNull(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id),
    invoiceLineId: uuid(),
    acquiredOn: date({ mode: "string" }).notNull(),
    costCents: cents().notNull(),
    years: integer().notNull(),
    account: text().notNull(),
    disposedOn: date({ mode: "string" }),
    disposeNote: text(),
  },
  (t) => [index("fixed_assets_invoice_idx").on(t.invoiceId)],
);
