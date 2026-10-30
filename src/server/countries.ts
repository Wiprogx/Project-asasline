import "server-only";
import { asc } from "drizzle-orm";
import type { Country } from "@/domain/countries";
import { cached, invalidateTags } from "./cache/cache";
import { db } from "./db/client";
import { countries } from "./db/schema";

export const COUNTRIES_TAG = "countries";

/** Every country by name, archived ones flagged (a record keeps naming its country). */
export const readCountries = () =>
  cached(
    "countries:all",
    { ttlSeconds: 600, tags: [COUNTRIES_TAG] },
    async (): Promise<Country[]> => {
      const rows = await db
        .select({
          code: countries.code,
          name: countries.name,
          dial: countries.dial,
          lang: countries.lang,
          archivedAt: countries.archivedAt,
        })
        .from(countries)
        .orderBy(asc(countries.name));
      return rows.map(({ archivedAt, ...c }) => ({ ...c, archived: archivedAt !== null }));
    },
  );

/** After a write to the countries or their cities: the pickers and the names read them again. */
export const invalidateCountries = () => invalidateTags(COUNTRIES_TAG);
