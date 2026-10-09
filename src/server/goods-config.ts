import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_HS_CODES, type HsCode } from "@/domain/goods";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "hsCodes";
export const HS_CODES_TAG = `config:${NAME}`;

export const hsCodesSchema = z
  .array(
    z.object({
      code: z.string().regex(/^\d{6}$/),
      description: z.string().trim().min(1).max(120),
    }),
  )
  .min(1)
  .max(2000);

const fallback = () => DEFAULT_HS_CODES.map((h) => ({ ...h }));

export async function readHsCodesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? hsCodesSchema.safeParse(row.value) : null;
  return { codes: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}

/** The HS codes the office uses (legacy HS_CODES): a Settings table, the built-in list until saved. */
export function readHsCodes(): Promise<HsCode[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [HS_CODES_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? hsCodesSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });
}
