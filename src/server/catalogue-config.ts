import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_RATE_CATEGORIES, type RateCategory } from "@/domain/pricing";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "rateCategories";
const TAG = `config:${NAME}`;

const account = z.string().regex(/^\d{6}$/);
const categoriesSchema = z
  .array(
    z.object({
      code: z.string().regex(/^[a-z]{2,20}$/),
      label: z.string().min(1).max(60),
      salesAccount: account,
      purchaseAccount: account,
    }),
  )
  .min(1)
  .max(40);

/**
 * The catalogue's categories and the accounts their sales and purchases go to (legacy
 * RATE_CATEGORIES) — a Settings table seeded with the legacy split, read here.
 */
export function readRateCategories(): Promise<RateCategory[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? categoriesSchema.safeParse(row.value) : null;
    if (parsed && !parsed.success)
      console.error(`[config] ${NAME} has an invalid shape; using the default`);
    return parsed?.success ? parsed.data : DEFAULT_RATE_CATEGORIES.map((c) => ({ ...c }));
  });
}
