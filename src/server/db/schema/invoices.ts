import {
  boolean,
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
import { cents, day, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { bookings } from "./shipments";

export const invoiceKindEnum = pgEnum("invoice_kind", INVOICE_KINDS);
export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES);

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
    // Euro for one unit of the currency, in ten-thousandths (legacy fx): the lines are in the
    // currency, the totals below are the euro the books carry at this rate.
    fxBp: integer().notNull().default(10_000),
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
    // Peppol (legacy peppol: ready / sent / received): when the office sent the file through the
    // access point, and whether a bill came in as a Peppol file.
    peppolSentAt: timestamp({ withTimezone: true }),
    peppolSentBy: uuid(),
    viaPeppol: boolean().notNull().default(false),
    // Brought over from Odoo at the cut-over: only the open part, against 499000; its revenue
    // and VAT were Odoo's, so it stays out of the VAT return and the listings.
    opening: boolean().notNull().default(false),
  },
  (t) => [
    uniqueIndex("invoices_number_uq").on(t.number),
    index("invoices_customer_idx").on(t.customerId),
    index("invoices_booking_idx").on(t.bookingId),
    index("invoices_status_idx").on(t.status, t.kind),
    // The credit notes of an invoice (read per open invoice) and the issued documents of a period.
    index("invoices_credit_of_idx").on(t.creditOfId),
    index("invoices_issue_date_idx").on(t.status, t.issueDate),
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
  (t) => [
    index("invoice_lines_invoice_idx").on(t.invoiceId),
    index("invoice_lines_source_idx").on(t.sourceKey),
  ],
);

/**
 * What is kept with an invoice or a bill (legacy attachments): the supplier's own PDF, the
 * UBL it was read from, a proof. The bytes live under FILES_DIR/invoices/<invoice>/<storedName>;
 * taken off with a reason, never deleted (invariant 1).
 */
export const invoiceFiles = pgTable(
  "invoice_files",
  {
    id: uuid().primaryKey().defaultRandom(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id),
    name: text().notNull(),
    storedName: text().notNull(),
    mime: text().notNull(),
    sizeBytes: integer().notNull(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid(),
    archivedAt: timestamp({ withTimezone: true }),
    archivedBy: uuid(),
    archivedReason: text(),
  },
  (t) => [index("invoice_files_invoice_idx").on(t.invoiceId)],
);

/**
 * What a supplier's line turned out to be (legacy BOOKS.lineMem): per supplier, the words of
 * a line and the cost account the office booked it on; the next bill from them is filled in.
 */
export const billLineMemory = pgTable(
  "bill_line_memory",
  {
    id: uuid().primaryKey().defaultRandom(),
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    key: text().notNull(),
    account: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid(),
  },
  (t) => [uniqueIndex("bill_line_memory_uq").on(t.contactId, t.key)],
);
