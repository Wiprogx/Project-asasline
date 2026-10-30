import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Stop } from "../../../domain/loading";
import type { AlertLevel } from "../../../domain/alerts";
import type { TrackStep } from "../../../domain/release";
import { day, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { cancelReasons, containerTypes, docTypes, packageTypes, sealSources } from "./lists";
import { bookingStatusEnum, shipmentKindEnum } from "./enums";
import { ports } from "./ports";
import { quotationRoutes, quotations } from "./quotations";
import { vessels } from "./vessels";

// The rate catalogue lives in its own file (size); it stays part of the shipments schema here.
export { priceListLines, priceLists, rateItems } from "./pricing";
export { vessels } from "./vessels";
export { quotationLines, quotationRoutes, quotations } from "./quotations";

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
    // The others on the file (legacy registry): who checks the papers, the line the box is booked
    // with, the trucker by default, the forwarder at destination, our forwarder, the customs agent.
    docCheckId: uuid().references(() => contacts.id),
    shippingCoId: uuid().references(() => contacts.id),
    transporterId: uuid().references(() => contacts.id),
    destForwarderId: uuid().references(() => contacts.id),
    forwarderId: uuid().references(() => contacts.id),
    customsAgentId: uuid().references(() => contacts.id),
    // Where the empty box is collected and the full one delivered (legacy pickupContainer, terminalContainer).
    pickupDepot: text(),
    pickupDate: day(),
    terminal: text(),
    /** The ports of loading and discharge (Settings › Ports). */
    polId: uuid().references(() => ports.id),
    podId: uuid().references(() => ports.id),
    loadAddress: text(),
    loadDate: day(),
    loadTime: text(),
    /** The mode agreed on the quotation; each box may say its own (domain/loading boxLoading). */
    loadingMode: text(),
    carrierBookingNo: text(),
    blNo: text(),
    /** Addresses copied on every message of the booking (legacy cc: they receive every document and answer for none). */
    cc: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** The transport document (Settings › Lists › Document types); a new booking: SEA WAYBILL. */
    docTypeId: uuid()
      .notNull()
      .references(() => docTypes.id),
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
    // Where the shipment stands for the consignee (domain/release): a hold names who asked and why.
    release: text().notNull().default("pending"),
    releaseById: uuid().references(() => contacts.id),
    releaseNote: text(),
    // The original papers: who receives them, by which courier, when, under which number.
    // Step 1 (legacy blPickAddr, sendRequestedAt): where the courier collects them, booked when.
    originalsPickup: text(),
    originalsRequestedOn: day(),
    docReceiverId: uuid().references(() => contacts.id),
    sendMode: text(),
    sendDate: day(),
    sendTracking: text(),
    /** The journey's milestones as ticked by hand (domain/release TrackStep); empty = not started. */
    track: jsonb().$type<TrackStep[]>().notNull().default([]),
    /** Why it was cancelled (Settings › Cancel reasons); cleared when it is put back. */
    cancelReasonId: uuid().references(() => cancelReasons.id),
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
    /** Its size and type (Settings › Lists › Container types); a new box: 40HC. */
    typeId: uuid()
      .notNull()
      .references(() => containerTypes.id),
    tareKg: integer(),
    cargoKg: integer(),
    // Loading — this box only (legacy per-box loading card): nothing is inherited between boxes.
    loadAddress: text(),
    loadDate: day(),
    loadTime: text(),
    loadingMode: text(),
    transporterId: uuid().references(() => contacts.id),
    /** When the loading finished, from the CMR: measured against the agreed hours. */
    loadEndDate: day(),
    loadEndTime: text(),
    /** When the truck comes back for a box left on site (a drop mode). */
    pickBackDate: day(),
    pickBackTime: text(),
    /** Extra stops for this box, in order (domain/loading Stop). */
    stops: jsonb().$type<Stop[]>().notNull().default([]),
    // Goods in this container: weight and packages per HS code (container_hs_lines); the box's
    // own figures stand when there are no lines; the B/L description is printed word for word.
    packages: integer(),
    /** How the box's goods are packed when it has no HS lines (Settings › Lists › Package types). */
    packageTypeId: uuid().references(() => packageTypes.id),
    blDescription: text(),
  },
  (t) => [index("containers_booking_idx").on(t.bookingId)],
);

/**
 * The goods in a container, one row per HS code (domain/goods HsLine): its weight, packages and
 * how they are packed. Replaced as a whole when the box is saved: the old lines are archived.
 */
export const containerHsLines = pgTable(
  "container_hs_lines",
  {
    ...recordColumns,
    containerId: uuid()
      .notNull()
      .references(() => containers.id),
    position: integer().notNull().default(0),
    code: text().notNull(),
    weightKg: integer(),
    packages: integer(),
    packageTypeId: uuid().references(() => packageTypes.id),
  },
  (t) => [index("container_hs_lines_container_idx").on(t.containerId)],
);

/**
 * A container's seals in the order they were set (domain/seals): the number as typed and who
 * sealed it. Replaced as a whole when the box is saved: the old seals are archived.
 */
export const containerSeals = pgTable(
  "container_seals",
  {
    ...recordColumns,
    containerId: uuid()
      .notNull()
      .references(() => containers.id),
    position: integer().notNull().default(0),
    number: text().notNull(),
    sourceId: uuid().references(() => sealSources.id),
  },
  (t) => [index("container_seals_container_idx").on(t.containerId)],
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

/**
 * The office's word on a paper (legacy requirement states verified / rejected): checked, or
 * sent back with a reason. Append-only — the latest row per code is the state, and a paper
 * filed after it asks for a new look. Nothing is ever deleted (invariant 1).
 */
export const requirementReviews = pgTable(
  "requirement_reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    /** The rule's code, or `CODE#boxId` for a per-box step. */
    code: text().notNull(),
    state: text().notNull(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid(),
  },
  (t) => [index("requirement_reviews_booking_idx").on(t.bookingId, t.code)],
);

/**
 * An onward leg of a booking after its main sailing (legacy legs[]): via a transhipment port,
 * one connecting vessel per row in order. The main sailing stays on the booking (its cut-offs);
 * the last leg's arrival is written back as the booking's ETA.
 */
export const bookingLegs = pgTable(
  "booking_legs",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    position: integer().notNull(),
    vesselId: uuid()
      .notNull()
      .references(() => vessels.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid(),
    // Taken off, never deleted (invariant 1): the history keeps the routing it once had.
    archivedAt: timestamp({ withTimezone: true }),
    archivedBy: uuid(),
  },
  (t) => [
    index("booking_legs_booking_idx").on(t.bookingId, t.position),
    index("booking_legs_vessel_idx").on(t.vesselId),
  ],
);

/**
 * An alert on a booking (legacy b.alerts): urgent, alert or info, and what it says. Resolved with
 * who and when, never deleted (invariant 1).
 */
export const bookingAlerts = pgTable(
  "booking_alerts",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id),
    level: text().$type<AlertLevel>().notNull(),
    text: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid(),
    resolvedAt: timestamp({ withTimezone: true }),
    resolvedBy: uuid(),
  },
  (t) => [index("booking_alerts_booking_idx").on(t.bookingId, t.resolvedAt)],
);
