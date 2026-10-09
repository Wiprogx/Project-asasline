import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_QUOTE_FIELDS, QUOTE_FIELD_KEYS, type QuoteFields } from "@/domain/quote-fields";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "quoteFields";
export const QUOTE_FIELDS_TAG = `config:${NAME}`;

export const quoteFieldsSchema = z.object(
  Object.fromEntries(QUOTE_FIELD_KEYS.map((k) => [k, z.boolean()])) as Record<
    (typeof QUOTE_FIELD_KEYS)[number],
    z.ZodBoolean
  >,
);

/** What the printed quotation shows (legacy QUOTE_FIELDS): everything until Settings says otherwise. */
export const readQuoteFields = () =>
  cached(NAME, { ttlSeconds: 600, tags: [QUOTE_FIELDS_TAG] }, async (): Promise<QuoteFields> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? quoteFieldsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : { ...DEFAULT_QUOTE_FIELDS };
  });

export async function readQuoteFieldsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? quoteFieldsSchema.safeParse(row.value) : null;
  return {
    fields: parsed?.success ? parsed.data : { ...DEFAULT_QUOTE_FIELDS },
    version: row?.version ?? 0,
  };
}
