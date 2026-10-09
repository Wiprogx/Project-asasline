import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ID_FORMATS, type IdFormat } from "@/domain/contacts";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "idFormats";
export const ID_FORMATS_TAG = `config:${NAME}`;

const compiles = (p: string) => {
  try {
    new RegExp(p);
    return true;
  } catch {
    return false;
  }
};

export const idFormatsSchema = z
  .array(
    z.object({
      country: z.string().regex(/^[A-Z]{2}$/),
      kind: z.enum(["vat", "eori"]),
      pattern: z.string().min(1).max(80).refine(compiles, "A pattern that compiles"),
      hint: z.string().min(1).max(80),
      eg: z.string().min(1).max(30),
    }),
  )
  .max(200);

const fallback = (): IdFormat[] => ID_FORMATS.map((f) => ({ ...f }));

/** The VAT and EORI formats per country (legacy ID_FORMATS), a Settings table; the legacy nineteen until saved. */
export const readIdFormats = () =>
  cached(NAME, { ttlSeconds: 600, tags: [ID_FORMATS_TAG] }, async (): Promise<IdFormat[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? idFormatsSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });

export async function readIdFormatsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? idFormatsSchema.safeParse(row.value) : null;
  return { formats: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}
