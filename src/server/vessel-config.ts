import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CUTOFF_KEYS, type CutoffRules, DEFAULT_CUTOFFS } from "@/domain/vessels";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "cutoffRules";
export const CUTOFF_TAG = `config:${NAME}`;

export const cutoffRulesSchema = z.object(
  Object.fromEntries(
    CUTOFF_KEYS.map((k) => [k, z.coerce.number().int().min(0, "0 or more").max(30, "At most 30")]),
  ) as Record<(typeof CUTOFF_KEYS)[number], z.ZodCoercedNumber<unknown>>,
);

/** Days before the ETD for each closing (a Settings table seeded with the legacy offsets). */
export function readCutoffRules(): Promise<CutoffRules> {
  return cached(NAME, { ttlSeconds: 600, tags: [CUTOFF_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? cutoffRulesSchema.safeParse(row.value) : null;
    return parsed?.success ? (parsed.data as CutoffRules) : { ...DEFAULT_CUTOFFS };
  });
}

export async function readCutoffRulesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? cutoffRulesSchema.safeParse(row.value) : null;
  return {
    rules: parsed?.success ? (parsed.data as CutoffRules) : { ...DEFAULT_CUTOFFS },
    version: row?.version ?? 0,
  };
}
