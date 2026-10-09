import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { cents, day, recordColumns } from "./_columns";
import { contacts } from "./contacts";
import { rateTypeEnum } from "./enums";

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
    /** Export, import, or null for both: which shipments a customs or free-time item serves. */
    scope: text(),
    /** Free time: demurrage, detention or combined; and at origin or destination. */
    freeKind: text(),
    side: text(),
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
