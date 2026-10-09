import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type Country, DEFAULT_COUNTRIES } from "@/domain/countries";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "countries";
export const COUNTRIES_TAG = `config:${NAME}`;

export const countriesSchema = z
  .array(
    z.object({
      code: z.string().regex(/^[A-Z]{2}$/),
      name: z.string().min(1).max(80),
      dial: z.string().regex(/^(\+\d{1,4})?$/),
      lang: z.string().regex(/^[a-z]{2}$/),
    }),
  )
  .min(1)
  .max(300);

const fallback = (): Country[] => DEFAULT_COUNTRIES.map((c) => ({ ...c }));

/** The countries (legacy COUNTRIES + COUNTRY_META), a Settings table; the legacy 124 until saved. */
export const readCountries = () =>
  cached(NAME, { ttlSeconds: 600, tags: [COUNTRIES_TAG] }, async (): Promise<Country[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? countriesSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });

export async function readCountriesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? countriesSchema.safeParse(row.value) : null;
  return { countries: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}
