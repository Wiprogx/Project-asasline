import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  index,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { recordColumns } from "./_columns";
import { portKindEnum } from "./enums";
import { portRegions } from "./lists";
import { countries } from "./geo";

/**
 * The ports the office ships from and to (legacy PORTS, Settings › Ports): a quotation's
 * destination, a booking, a catalogue item and a sailing point at one by its id. The UN/LOCODE
 * is the port's for good (unique, archived rows included); its name and the rest may change.
 * Never deleted: a port no longer offered is archived with a reason.
 */
export const ports = pgTable(
  "ports",
  {
    ...recordColumns,
    code: char({ length: 5 }).notNull(),
    name: text().notNull(),
    country: char({ length: 2 })
      .notNull()
      .references(() => countries.code),
    /** The region it is filed under (Settings › Lists › Port regions). */
    regionId: uuid().references(() => portRegions.id),
    kind: portKindEnum().notNull().default("sea"),
    /** Other names it goes by (Apapa, JNPT…): a port field finds it by any of them. */
    aliases: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Decimal degrees (WGS 84), a position — not money, so a fixed-point number. */
    latitude: numeric({ precision: 8, scale: 5 }),
    longitude: numeric({ precision: 8, scale: 5 }),
    /** IANA time zone (Africa/Douala): a sailing's local times there. */
    timezone: text(),
    /** The goods are cleared before loading here: the papers are asked for earlier. */
    preClearance: boolean().notNull().default(false),
    notes: text(),
  },
  (t) => [uniqueIndex("ports_code_uq").on(t.code), index("ports_country_idx").on(t.country)],
);
