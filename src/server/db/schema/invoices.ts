import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { INVOICE_KINDS, INVOICE_STATUSES } from "../../../domain/invoicing";
import { cents, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { bookings } from "./shipments";

export const invoiceKindEnum = pgEnum("invoice_kind", INVOICE_KINDS);
export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES);

const day = () => date({ mode: "string" });

/**
 * Sales invoices and credit notes. `number` stays null while a draft and is set once, at
 * issue, from the yearly sequence; the unique index keeps the series unbroken and unique.
 * An issued invoice is never updated again except by its payment state (next step).
 */
export const invoices = pgTable(
  "invoices",
  {
    ...recordColumns,
    kind: invoiceKindEnum().notNull().default("invoice"),
    status: invoiceStatusEnum().notNull().default("draft"),
    number: text(),
    customerId: uuid()
      .notNull()
      .references(() => contacts.id),
    bookingId: uuid().references(() => bookings.id),
    creditOfId: uuid(),
    issueDate: day(),
    dueDate: day(),
    paymentTermId: text(),
    currency: text().notNull().default("EUR"),
    ogm: text(),
    note: text(),
    reason: text(),
    netCents: cents(),
    vatCents: cents(),
    grossCents: cents(),
    // Supplier bills: the supplier's own number, and the second person who approved it.
    supplierRef: text(),
    approvedBy: uuid(),
    approvedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.number),
    index("invoices_customer_idx").on(t.customerId),
    index("invoices_booking_idx").on(t.bookingId),
    index("invoices_status_idx").on(t.status, t.kind),
  ],
);

/** `sourceKey` ties a line to the booking line it bills (partial and multi-payer billing). */
export const invoiceLines = pgTable(
  "invoice_lines",
  {
    ...recordColumns,
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id),
    position: integer().notNull().default(0),
    sourceKey: text(),
    description: text().notNull(),
    qty: integer().notNull().default(1),
    unitCents: cents().notNull(),
    vatCode: text().notNull(),
    account: text().notNull().default("700000"),
  },
  (t) => [index("invoice_lines_invoice_idx").on(t.invoiceId)],
);
