import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { cityKey, type PlaceOption, placeWords } from "@/domain/cities";
import { db, type DbOrTx } from "./db/client";
import { cities } from "./db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The live cities some letters name, in any country (a catalogue place): a name, other name or
 * region that starts so first, then the biggest; 30 at most. "anvers" finds Antwerp (BE).
 */
export async function searchCities(q: string, limit = 30): Promise<PlaceOption[]> {
  const key = cityKey(q);
  if (!key) return [];
  return db
    .select({
      id: cities.id,
      name: cities.name,
      country: cities.country,
      region: cities.region,
      keywords: cities.searchKey,
    })
    .from(cities)
    .where(and(isNull(cities.archivedAt), sql`${cities.searchKey} like ${`%${key}%`}`))
    .orderBy(
      desc(sql`${cities.searchKey} like ${`${key}%`}`),
      desc(sql`coalesce(${cities.population}, 0)`),
      asc(cities.name),
    )
    .limit(limit);
}

export type Place = { cityId: string | null; words: string | null; problem?: string };

/**
 * A catalogue place as its form posts it: a city's id gives the city and its words
 * ("Antwerp (BE)"); words from before the cities (a legacy row, "Antwerp depot") are kept as
 * they are, with no city; a city the list no longer offers is a problem in words.
 */
export async function cityPlace(tx: DbOrTx, value: string | null): Promise<Place> {
  if (!value) return { cityId: null, words: null };
  if (!UUID.test(value)) return { cityId: null, words: value };
  const [c] = await tx
    .select({
      id: cities.id,
      name: cities.name,
      country: cities.country,
      archivedAt: cities.archivedAt,
    })
    .from(cities)
    .where(eq(cities.id, value));
  if (!c) return { cityId: null, words: null, problem: "Pick the place from the list of cities." };
  if (c.archivedAt)
    return {
      cityId: null,
      words: null,
      problem: `${placeWords(c)} is no longer offered: pick another city.`,
    };
  return { cityId: c.id, words: placeWords(c) };
}
