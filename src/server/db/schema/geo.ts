import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  char,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { recordColumns } from "./_columns";

/**
 * The countries (Settings › Countries; legacy COUNTRIES + COUNTRY_META): every ISO country, the
 * office's name for it, the dial code of its phones and the language the office writes to a
 * contact there. A record names a country by its ISO code, which never changes: the code is
 * the key the contacts, the catalogue and the ports point at. Archived, never deleted.
 */
export const countries = pgTable("countries", {
  ...recordColumns,
  code: char({ length: 2 }).notNull().unique(),
  name: text().notNull(),
  dial: text().notNull().default(""),
  lang: text().notNull().default("en"),
});

/**
 * The cities of each country (Settings › Countries › a country; GeoNames, CC-BY 4.0): a
 * contact's city is one of its country's rows, picked, never typed — no "Mersn". `searchKey`
 * holds the name, the other names and the region without accents or case, as a search reads
 * them. A city typed wrong is merged into the right one: its records move, it is archived and
 * `mergedIntoId` remembers where they went.
 */
export const cities = pgTable(
  "cities",
  {
    ...recordColumns,
    country: char({ length: 2 })
      .notNull()
      .references(() => countries.code),
    name: text().notNull(),
    /** The province, state or region (GeoNames first-level division): two Saint-Denis apart. */
    region: text(),
    aliases: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    searchKey: text().notNull().default(""),
    population: integer(),
    latitude: numeric({ precision: 8, scale: 5 }),
    longitude: numeric({ precision: 8, scale: 5 }),
    timezone: text(),
    /** GeoNames' id, for a later refresh; none for a city the office added. */
    geonameId: integer(),
    notes: text(),
    mergedIntoId: uuid().references((): AnyPgColumn => cities.id),
  },
  (t) => [
    index("cities_country_idx").on(t.country, t.name),
    uniqueIndex("cities_geoname_uq").on(t.geonameId),
  ],
);

/**
 * The postal codes of a country (Settings › Countries › a country; GeoNames, CC-BY 4.0): the
 * code, its place as the post writes it ("Berchem") and the city it belongs to, so a postcode
 * typed fills the city in. A country with codes here takes only these on its addresses (the
 * Netherlands by the four digits of "1011 AB"); one without keeps whatever is typed.
 */
export const postalCodes = pgTable(
  "postal_codes",
  {
    ...recordColumns,
    country: char({ length: 2 })
      .notNull()
      .references(() => countries.code),
    code: text().notNull(),
    place: text().notNull(),
    cityId: uuid().references(() => cities.id),
  },
  (t) => [
    index("postal_codes_country_code_idx").on(t.country, t.code),
    index("postal_codes_city_idx").on(t.cityId),
  ],
);
