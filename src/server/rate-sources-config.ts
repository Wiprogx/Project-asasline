import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_RATE_SOURCES, type RateSource } from "@/domain/rate-sources";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "rateSources";
export const RATE_SOURCES_TAG = `config:${NAME}`;

export const rateSourcesSchema = z
  .array(
    z.object({
      key: z.string().regex(/^[a-z][a-z0-9_]{0,20}$/),
      label: z.string().min(1).max(60),
    }),
  )
  .min(1)
  .max(50);

const fallback = (): RateSource[] => DEFAULT_RATE_SOURCES.map((s) => ({ ...s }));

/** Where a rate comes from (legacy RATE_TYPES), a Settings table; contract and spot until saved. */
export const readRateSources = () =>
  cached(NAME, { ttlSeconds: 600, tags: [RATE_SOURCES_TAG] }, async (): Promise<RateSource[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? rateSourcesSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });

export async function readRateSourcesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? rateSourcesSchema.safeParse(row.value) : null;
  return { sources: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}
