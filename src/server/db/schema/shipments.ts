import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { HsLine } from "../../../domain/goods";
import type { Stop } from "../../../domain/loading";
import { cents, day, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import {
  bookingStatusEnum,
  quotationDisplayEnum,
  quotationStatusEnum,
  shipmentKindEnum,
  vesselStatusEnum,
} from "./enums";
import { rateItems } from "./pricing";

// The rate catalogue lives in its own file (size); it stays part of the shipments schema here.
export { priceListLines, priceLists, rateItems } from "./pricing";

export const quotations = pgTable(
  "quotations",
  {
    ...recordColumns,
    ref: text().notNull(),
    clientId: uuid()
      .notNull()
      .references(() => contacts.id),
    status: quotationStatusEnum().notNull().default("draft"),
    /** Export or import: decides the customs, VGM and free-time lines a destination starts with. */
    kind: shipmentKindEnum().notNull().default("export"),
    validUntil: day(),
    paymentTermId: text(),
    currency: text().notNull().default("EUR"),
    note: text(),
    /** Itemized, or one price per destination naming the listed services (domain/quotation-doc). */
    display: quotationDisplayEnum().notNull().default("itemized"),
    sentOn: day(),
    sentVia: text(),
  },
  (t) => [
    uniqueIndex("quotations_ref_uq").on(t.ref),
    index("quotations_client_idx").on(t.clientId),
  ],
);

/** One destination of a quotation; a quotation may offer several and some may be declined. */
export const quotationRoutes = pgTable(
  "quotation_routes",
  {
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
    /** Why the customer declined this destination; it stays on the quotation for the record. */
    declinedReason: text(),
    /** The agreed loading mode (domain/loading): how many hours the price includes, or a drop-off. */
    loadingMode: text(),
  },
  (t) => [index("quotation_routes_quotation_idx").on(t.quotationId, t.position)],
);

export const quotationLines = pgTable(
  "quotation_lines",
  {
    ...recordColumns,
    routeId: uuid()
      .notNull()
      .references(() => quotationRoutes.id),
    position: integer().notNull().default(0),
    itemCode: text(),
    /** The catalogue item the line was priced from; null for a line typed by hand. */
    itemId: uuid().references(() => rateItems.id),
    description: text().notNull(),
    qty: integer().notNull().default(1),
    perBox: boolean().notNull().default(false),
    sellCents: cents(),
    costCents: cents(),
    vatCode: text().notNull().default("EX41"),
    priceSource: text(),
    /** Named on an all-inclusive quotation (without its price). */
    listed: boolean().notNull().default(true),
  },
  (t) => [
    index("quotation_lines_route_idx").on(t.routeId, t.position),
    index("quotation_lines_item_idx").on(t.itemId),
  ],
);

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
    /** The destination of the quotation this booking ships; its lines are the booking's price. */
    quotationRouteId: uuid().references(() => quotationRoutes.id),
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
    /** The mode agreed on the quotation; each box may say its own (domain/loading boxLoading). */
    loadingMode: text(),
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
    // The quotation's bookings, the route's booking, a vessel's bookings, and the parties
    // (the archive guard on a contact looks through every party column).
    index("bookings_quotation_idx").on(t.quotationId),
    index("bookings_quotation_route_idx").on(t.quotationRouteId),
    index("bookings_vessel_idx").on(t.vesselId),
    index("bookings_payer_idx").on(t.payerId),
    index("bookings_shipper_idx").on(t.shipperId),
    index("bookings_consignee_idx").on(t.consigneeId),
    index("bookings_notify_idx").on(t.notifyId),
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
    // Loading — this box only (legacy per-box loading card): nothing is inherited between boxes.
    loadAddress: text(),
    loadDate: day(),
    loadTime: text(),
    loadingMode: text(),
    transporterId: uuid().references(() => contacts.id),
    /** When the truck comes back for a box left on site (a drop mode). */
    pickBackDate: day(),
    pickBackTime: text(),
    /** Extra stops for this box, in order (domain/loading Stop). */
    stops: jsonb().$type<Stop[]>().notNull().default([]),
    // Goods in this container (domain/goods): weight and packages per HS code; the box's own
    // figures stand when there are no lines; the B/L description is printed word for word.
    hsLines: jsonb().$type<HsLine[]>().notNull().default([]),
    packages: integer(),
    packageType: text(),
    blDescription: text(),
  },
  (t) => [index("containers_booking_idx").on(t.bookingId)],
);

/**
 * A file on a booking (legacy b.docs): the bytes live under FILES_DIR as `storedName`, the
 * record says what it is — the code it is filed under, draft or final, the box and the
 * document step it proves. Taken off with a reason, never deleted (invariant 1).
 */
export const bookingFiles = pgTable(
  "booking_files",
  {
    ...recordColumns,
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    containerId: uuid().references(() => containers.id),
    name: text().notNull(),
    storedName: text().notNull(),
    mime: text().notNull(),
    sizeBytes: integer().notNull(),
    code: text(),
    stage: text().notNull().default("final"),
    ruleCode: text(),
    note: text(),
  },
  (t) => [
    index("booking_files_booking_idx").on(t.bookingId),
    uniqueIndex("booking_files_stored_uq").on(t.bookingId, t.storedName),
  ],
);
