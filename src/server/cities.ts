import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { type CityOption, cityKey } from "@/domain/cities";
import { cached } from "./cache/cache";
import { COUNTRIES_TAG } from "./countries";
import { db, type DbOrTx } from "./db/client";
import { cities } from "./db/schema";

/** A country's live cities, the biggest first: what its city field offers. */
export function citiesOf(country: string): Promise<CityOption[]> {
  const cc = country.toUpperCase();
  return cached(`cities:${cc}`, { ttlSeconds: 3600, tags: [COUNTRIES_TAG] }, () =>
    db
      .select({ id: cities.id, name: cities.name, region: cities.region, aliases: cities.aliases })
      .from(cities)
      .where(and(eq(cities.country, cc), isNull(cities.archivedAt)))
      .orderBy(desc(cities.population), asc(cities.name)),
  );
}

/** Rows with their city's name added as `city`, archived cities too (a record keeps its city). */
export async function withCities<T extends { cityId: string | null }>(
  rows: readonly T[],
  tx: DbOrTx = db,
): Promise<(T & { city: string | null })[]> {
  const ids = [...new Set(rows.map((r) => r.cityId).filter((id): id is string => !!id))];
  const names = ids.length
    ? await tx
        .select({ id: cities.id, name: cities.name })
        .from(cities)
        .where(inArray(cities.id, ids))
    : [];
  const byId = new Map(names.map((c) => [c.id, c.name]));
  return rows.map((r) => ({ ...r, city: r.cityId ? (byId.get(r.cityId) ?? null) : null }));
}

/**
 * Why this city cannot go on a record of that country, or null: it must be one of the
 * country's live cities — or the city the record already had, even archived since.
 */
export async function cityProblem(
  tx: DbOrTx,
  cityId: string | null | undefined,
  country: string | null | undefined,
  kept?: string | null,
): Promise<string | null> {
  if (!cityId) return null;
  const [row] = await tx
    .select({ country: cities.country, archivedAt: cities.archivedAt })
    .from(cities)
    .where(eq(cities.id, cityId));
  if (!row) return "Pick the city from the list.";
  if (row.country !== country?.toUpperCase()) return "This city is not in the country chosen.";
  if (row.archivedAt && cityId !== kept) return "This city is no longer offered: pick another.";
  return null;
}

/**
 * The city some words name in a country (an import, an Odoo file): its name or another name,
 * without accents, case or a trailing "(PT)"; the biggest such city. Null when none — the
 * words are then reported, never added as a city (Settings › Countries adds one).
 */
export async function cityIdFor(
  country: string | null | undefined,
  words: string | null | undefined,
) {
  if (!country || !words?.trim()) return null;
  const key = cityKey(words.replace(/\s*\([^)]*\)\s*$/, ""));
  const all = await citiesOf(country);
  const hit = all.find((c) => cityKey(c.name) === key || c.aliases.some((a) => cityKey(a) === key));
  return hit?.id ?? null;
}
