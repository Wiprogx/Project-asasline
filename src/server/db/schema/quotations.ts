import { boolean, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { cents, day, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { quotationDisplayEnum, quotationStatusEnum, shipmentKindEnum } from "./enums";
import { rateItems } from "./pricing";

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
    /** How many containers this destination is quoted for: a per-container line is multiplied by it. */
    boxes: integer().notNull().default(1),
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
    /** Multiplied by the destination's containers (legacy: a line with no box applies to every box). */
    perBox: boolean().notNull().default(true),
    /** A term, not a charge (free time): named on the paper, never totalled. */
    condition: boolean().notNull().default(false),
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
