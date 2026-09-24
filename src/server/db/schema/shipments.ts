import { sql } from "drizzle-orm";
import {
  boolean,
  char,
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
  quotationDisplayEnum,
  quotationStatusEnum,
  rateTypeEnum,
  shipmentKindEnum,
  vesselStatusEnum,
} from "./enums";

/** Dates are stored as `date` and read as "YYYY-MM-DD" strings — never as instants. */
const day = () => date({ mode: "string" });

/**
 * The rate catalogue (legacy RATE_ITEMS): every chargeable thing — an ocean leg, an inland
 * move, customs, a country document, VGM, free time, an extra — with its buy and sell price.
 * Which columns matter depends on the category (domain/pricing NEEDS). Archived, never deleted:
 * quotation lines point at it.
 */
export const rateItems = pgTable(
  "rate_items",
  {
    ...recordColumns,
    category: text().notNull(),
    name: text(),
    pol: text(),
    pod: text(),
    country: char({ length: 2 }),
    containerType: text(),
    carrier: text(),
    transitDays: integer(),
    fromPlace: text(),
    toPlace: text(),
    docCode: text(),
    freeDays: integer(),
    sellCents: cents().notNull().default(0),
    buyCents: cents().notNull().default(0),
    vatCode: text().notNull().default("EX41"),
    rateType: rateTypeEnum().notNull().default("contract"),
    validUntil: day(),
    note: text(),
  },
  (t) => [index("rate_items_category_idx").on(t.category), index("rate_items_pod_idx").on(t.pod)],
);

/** A customer's agreed prices for a period (legacy PRICE_LISTS). One live list per day. */
export const priceLists = pgTable(
  "price_lists",
  {
    ...recordColumns,
    contactId: uuid()
      .notNull()
      .references(() => contacts.id),
    name: text().notNull(),
    validFrom: day(),
    validUntil: day(),
    active: boolean().notNull().default(true),
  },
  (t) => [index("price_lists_contact_idx").on(t.contactId)],
);

/** One agreed price; an item appears at most once among a list's lines still in use. */
export const priceListLines = pgTable(
  "price_list_lines",
  {
    ...recordColumns,
    priceListId: uuid()
      .notNull()
      .references(() => priceLists.id),
    itemId: uuid()
      .notNull()
      .references(() => rateItems.id),
    sellCents: cents().notNull(),
    buyCents: cents().notNull(),
  },
  (t) => [
    uniqueIndex("price_list_lines_item_uq")
      .on(t.priceListId, t.itemId)
      .where(sql`${t.archivedAt} is null`),
  ],
);

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
  /** Why the customer declined this destination; it stays on the quotation for the record. */
  declinedReason: text(),
});

export const quotationLines = pgTable("quotation_lines", {
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
