/**
 * A legacy contact's city, as the words it held: one of its country's cities (by name or other
 * name, without accents or case), else a row kept for the office to check or merge in Settings ›
 * Countries, as migration 0074 did. Words without a country are left in the note.
 */
import { cityKey } from "../../src/domain/cities";
import { cityIdFor } from "../../src/server/cities";
import type { DbOrTx } from "../../src/server/db/client";
import { cities, countries } from "../../src/server/db/schema";

export const CHECK_CITY =
  "Typed on a legacy contact before the city list: check it, or merge it into the right city.";

export async function importCityId(
  tx: DbOrTx,
  country: string | null | undefined,
  words: string | null | undefined,
  warn: (w: string) => void,
): Promise<string | null> {
  const name = words?.trim();
  if (!name || !country) return null;
  const known = await cityIdFor(country, name);
  if (known) return known;
  const [made] = await tx
    .insert(cities)
    .values({ country, name, searchKey: cityKey(name), notes: CHECK_CITY })
    .returning({ id: cities.id });
  warn(`city "${name}" is not in ${country}'s list — kept, to check in Settings › Countries`);
  return made.id;
}

/** A city with no country to be in: its words, for the contact's note. */
export const cityNote = (country: string | null | undefined, words: string | null | undefined) =>
  !country && words?.trim() ? `City before the city list: ${words.trim()}` : null;

/**
 * A legacy country code as the countries table holds it (the EU's UK and EL as GB and GR), or
 * null — with a warning — for a code that is no country.
 */
export async function importCountry(
  tx: DbOrTx,
  code: string | null | undefined,
  warn: (w: string) => void,
) {
  const raw = code?.trim().toUpperCase();
  if (!raw) return null;
  const cc = raw === "UK" ? "GB" : raw === "EL" ? "GR" : raw;
  const known = await tx.select({ code: countries.code }).from(countries);
  if (known.some((c) => c.code === cc)) return cc;
  warn(`country "${raw}" is not a country of Settings › Countries — left off`);
  return null;
}
