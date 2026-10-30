import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { cityKey } from "@/domain/cities";
import { COUNTRY_CODE } from "@/domain/countries";
import { requirePermission } from "@/server/auth/dal";
import { citiesOf } from "@/server/cities";
import { postcodesLike, postcodesOfCity } from "@/server/postcodes";
import { db } from "@/server/db/client";
import { cities, countries } from "@/server/db/schema";

/** A country's cities for a city field: any office role that edits contacts may read them. */
export async function cityOptions(country: string) {
  await requirePermission("app.contacts");
  const cc = country.toUpperCase();
  return COUNTRY_CODE.test(cc) ? citiesOf(cc) : [];
}

/**
 * The postcodes a postcode field suggests: as the person types, those that start so (the city's
 * own first); nothing typed and a city picked, the city's own.
 */
export async function postcodeOptions(country: string, typed: string, cityId?: string | null) {
  await requirePermission("app.contacts");
  if (!COUNTRY_CODE.test(country.toUpperCase())) return [];
  if (!typed.trim()) return cityId ? postcodesOfCity(country, cityId) : [];
  return postcodesLike(country, typed, cityId);
}

/**
 * How many contacts (and their addresses) a country or a city is on. The outer column is spelled
 * out: from one table, Drizzle drops its prefix, and "id" would read as the contact's own.
 */
const contactsOn = (column: "country" | "city_id", outer: '"countries"."code"' | '"cities"."id"') =>
  sql
    .raw(
      `((select count(*) from contacts x where x.${column} = ${outer})
    + (select count(*) from contact_addresses x where x.${column} = ${outer} and x.archived_at is null))::int`,
    )
    .mapWith(Number);

/** The countries as Settings › Countries edits them: by name, live ones unless archived are asked for. */
export async function countriesForEdit(scope: { q?: string; archived?: boolean }) {
  await requirePermission("app.settings");
  const q = scope.q?.trim();
  return db
    .select({
      id: countries.id,
      version: countries.version,
      code: countries.code,
      name: countries.name,
      dial: countries.dial,
      lang: countries.lang,
      archivedAt: countries.archivedAt,
      archivedReason: countries.archivedReason,
      cities: sql<number>`(select count(*)::int from cities c where c.country = "countries"."code" and c.archived_at is null)`,
      contacts: contactsOn("country", '"countries"."code"'),
    })
    .from(countries)
    .where(
      and(
        scope.archived ? isNotNull(countries.archivedAt) : isNull(countries.archivedAt),
        q ? or(ilike(countries.name, `%${q}%`), ilike(countries.code, q)) : undefined,
      ),
    )
    .orderBy(asc(countries.name));
}

export type CountryRow = Awaited<ReturnType<typeof countriesForEdit>>[number];

export async function countryByCode(code: string) {
  await requirePermission("app.settings");
  if (!COUNTRY_CODE.test(code.toUpperCase())) return null;
  const [row] = await db.select().from(countries).where(eq(countries.code, code.toUpperCase()));
  return row ?? null;
}

export type CityScope = { q?: string; archived?: boolean; toCheck?: boolean };

/**
 * A country's cities as Settings edits them, the biggest first, 200 at most: searched by name,
 * other name or region, without accents; `toCheck` shows the rows the office added or the
 * migration kept from a contact's words.
 */
export async function citiesForEdit(country: string, scope: CityScope) {
  await requirePermission("app.settings");
  const key = scope.q ? cityKey(scope.q) : "";
  return db
    .select({
      id: cities.id,
      version: cities.version,
      name: cities.name,
      region: cities.region,
      aliases: cities.aliases,
      population: cities.population,
      timezone: cities.timezone,
      notes: cities.notes,
      fromList: sql<boolean>`${cities.geonameId} is not null`,
      archivedAt: cities.archivedAt,
      archivedReason: cities.archivedReason,
      contacts: contactsOn("city_id", '"cities"."id"'),
    })
    .from(cities)
    .where(
      and(
        eq(cities.country, country.toUpperCase()),
        scope.archived ? isNotNull(cities.archivedAt) : isNull(cities.archivedAt),
        scope.toCheck ? isNull(cities.geonameId) : undefined,
        key ? sql`${cities.searchKey} like ${`%${key}%`}` : undefined,
      ),
    )
    .orderBy(desc(sql`coalesce(${cities.population}, 0)`), asc(cities.name))
    .limit(200);
}

export type CityRow = Awaited<ReturnType<typeof citiesForEdit>>[number];
