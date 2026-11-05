import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { LANGUAGES } from "@/domain/contacts";
import { COUNTRY_CODE } from "@/domain/countries";
import { DEFAULT_REGION_LANGUAGES, type RegionLanguageRow } from "@/domain/region-languages";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "regionLanguages";
/** The countries are read with their regions: a save here clears them too. */
export const REGION_LANGUAGES_TAG = `config:${NAME}`;

export const regionLanguagesSchema = z
  .array(
    z.object({
      country: z.string().regex(COUNTRY_CODE),
      region: z.string().min(1).max(60),
      lang: z.enum(LANGUAGES),
    }),
  )
  .max(500);

const fallback = (): RegionLanguageRow[] => DEFAULT_REGION_LANGUAGES.map((r) => ({ ...r }));

/** The regions written to in another language than their country's, a Settings table; Belgium's and Switzerland's until saved. */
export const readRegionLanguages = () =>
  cached(
    NAME,
    { ttlSeconds: 600, tags: [REGION_LANGUAGES_TAG] },
    async (): Promise<RegionLanguageRow[]> => {
      const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
      const parsed = row ? regionLanguagesSchema.safeParse(row.value) : null;
      return parsed?.success ? parsed.data : fallback();
    },
  );

export async function readRegionLanguagesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? regionLanguagesSchema.safeParse(row.value) : null;
  return { rows: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}
