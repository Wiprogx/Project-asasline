import { date, index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { PAYMENT_METHODS } from "../../../domain/payments";
import { cents, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { invoices } from "./invoices";

export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);
export const paymentStatusEnum = pgEnum("payment_status", ["posted", "reversed"]);
export const bankLineStateEnum = pgEnum("bank_line_state", ["open", "matched", "ignored"]);

const day = () => date({ mode: "string" });

/**
 * Money received. Reversed with a reason and a date, never deleted: the books must show that
 * it was booked and then undone. `diffCents` is a shortfall written off to `diffAccount`.
 */
export const payments = pgTable(
  "payments",
  {
    ...recordColumns,
    status: paymentStatusEnum().notNull().default("posted"),
    contactId: uuid().references(() => contacts.id),
    date: day().notNull(),
    amountCents: cents().notNull(),
    method: paymentMethodEnum().notNull().default("bank"),
    reference: text(),
    bankLineId: uuid(),
    diffCents: cents().notNull().default(0),
    diffAccount: text(),
    reversedOn: day(),
    reversalReason: text(),
  },
  (t) => [index("payments_contact_idx").on(t.contactId), index("payments_date_idx").on(t.date)],
);

/** How much of a payment settles which invoice. */
export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    ...recordColumns,
    paymentId: uuid()
      .notNull()
      .references(() => payments.id),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id),
    amountCents: cents().notNull(),
  },
  (t) => [
    index("allocations_invoice_idx").on(t.invoiceId),
    index("allocations_payment_idx").on(t.paymentId),
  ],
);

/** One movement of an imported statement (CODA or CSV). `dedupKey` makes a re-import harmless. */
export const bankLines = pgTable(
  "bank_lines",
  {
    ...recordColumns,
    dedupKey: text().notNull(),
    source: text().notNull(),
    account: text(),
    date: day().notNull(),
    amountCents: cents().notNull(),
    name: text(),
    iban: text(),
    comm: text(),
    ogm: text(),
    state: bankLineStateEnum().notNull().default("open"),
    paymentId: uuid(),
    note: text(),
  },
  (t) => [
    uniqueIndex("bank_lines_dedup_uq").on(t.dedupKey),
    index("bank_lines_state_idx").on(t.state, t.date),
  ],
);
