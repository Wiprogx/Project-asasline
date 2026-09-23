import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { cents, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import {
  bookingStatusEnum,
  quotationStatusEnum,
  shipmentKindEnum,
  vesselStatusEnum,
} from "./enums";

/** Dates are stored as `date` and read as "YYYY-MM-DD" strings — never as instants. */
const day = () => date({ mode: "string" });

export const quotations = pgTable(
  "quotations",
  {
    ...recordColumns,
    ref: text().notNull(),
    clientId: uuid()
      .notNull()
      .references(() => contacts.id),
    status: quotationStatusEnum().notNull().default("draft"),
    validUntil: day(),
    paymentTermId: text(),
    currency: text().notNull().default("EUR"),
    note: text(),
  },
  (t) => [
    uniqueIndex("quotations_ref_uq").on(t.ref),
    index("quotations_client_idx").on(t.clientId),
  ],
);

/** One destination of a quotation; a quotation may offer several and some may be declined. */
export const quotationRoutes = pgTable("quotation_routes", {
  ...recordColumns,
  quotationId: uuid()
    .notNull()
    .references(() => quotations.id),
  position: integer().notNull().default(0),
  pol: text().notNull(),
  pod: text().notNull(),
  finalPlace: text(),
  containerType: text(),
  declined: boolean().notNull().default(false),
});

export const quotationLines = pgTable("quotation_lines", {
  ...recordColumns,
  routeId: uuid()
    .notNull()
    .references(() => quotationRoutes.id),
  position: integer().notNull().default(0),
  itemCode: text(),
  description: text().notNull(),
  qty: integer().notNull().default(1),
  perBox: boolean().notNull().default(false),
  sellCents: cents(),
  costCents: cents(),
  vatCode: text().notNull().default("EX41"),
  priceSource: text(),
});

/**
 * A sailing of the vessel register: one ship on one voyage between two ports. Bookings on it
 * take their dates and closings from here (domain/vessels); moving it moves them.
 */
export const vessels = pgTable(
  "vessels",
  {
    ...recordColumns,
    name: text().notNull(),
    imo: text(),
    carrier: text(),
    service: text(),
    voyage: text().notNull(),
    pol: text(),
    pod: text(),
    etd: day(),
    eta: day(),
    atd: day(),
    ata: day(),
    status: vesselStatusEnum().notNull().default("scheduled"),
  },
  (t) => [index("vessels_etd_idx").on(t.etd)],
);

export const bookings = pgTable(
  "bookings",
  {
    ...recordColumns,
    ref: text().notNull(),
    quotationId: uuid().references(() => quotations.id),
    kind: shipmentKindEnum().notNull().default("export"),
    status: bookingStatusEnum().notNull().default("confirmed"),
    clientId: uuid()
      .notNull()
      .references(() => contacts.id),
    payerId: uuid().references(() => contacts.id),
    shipperId: uuid().references(() => contacts.id),
    consigneeId: uuid().references(() => contacts.id),
    notifyId: uuid().references(() => contacts.id),
    pol: text(),
    pod: text(),
    loadAddress: text(),
    loadDate: day(),
    loadTime: text(),
    carrierBookingNo: text(),
    blNo: text(),
    docType: text().notNull().default("SEA WAYBILL"),
    vesselId: uuid().references(() => vessels.id),
    vesselName: text(),
    voyage: text(),
    etd: day(),
    eta: day(),
    // Closings the document rules anchor on (legacy vessel cut-offs, kept on the booking for now).
    customsClosing: day(),
    vgmClosing: day(),
    siClosing: day(),
    portCutOff: day(),
    commodity: text(),
    cancelReason: text(),
    statusBeforeCancel: bookingStatusEnum("status_before_cancel"),
  },
  (t) => [
    uniqueIndex("bookings_ref_uq").on(t.ref),
    index("bookings_client_idx").on(t.clientId),
    index("bookings_status_idx").on(t.status),
  ],
);

export const containers = pgTable(
  "containers",
  {
    ...recordColumns,
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    position: integer().notNull().default(0),
    number: text(),
    type: text().notNull().default("40HC"),
    seals: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    tareKg: integer(),
    cargoKg: integer(),
  },
  (t) => [index("containers_booking_idx").on(t.bookingId)],
);
