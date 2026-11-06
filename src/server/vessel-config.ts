import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { snapQuarterHour } from "@/domain/moments";
import {
  CUTOFF_KEYS,
  type CutoffKey,
  type CutoffRule,
  type CutoffRules,
  cutoffTimeKey,
  DEFAULT_CUTOFFS,
} from "@/domain/vessels";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "cutoffRules";
export const CUTOFF_TAG = `config:${NAME}`;

const days = z.coerce.number().int().min(0, "0 or more").max(30, "At most 30");
const hour = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "The hour as HH:MM")
  .optional()
  .transform((v) => (v ? snapQuarterHour(v) : null));

/**
 * The closings as the Settings form posts them: for each, the days before the ETD under the
 * closing's key and the hour of the day under `<key>Time` — read into one rule per closing.
 */
export const cutoffRulesSchema = z
  .object({
    ...(Object.fromEntries(CUTOFF_KEYS.map((k) => [k, days])) as Record<CutoffKey, typeof days>),
    ...(Object.fromEntries(CUTOFF_KEYS.map((k) => [cutoffTimeKey(k), hour])) as Record<
      ReturnType<typeof cutoffTimeKey>,
      typeof hour
    >),
  })
  .transform(
    (v) =>
      Object.fromEntries(
        CUTOFF_KEYS.map((k) => [k, { days: v[k], time: v[cutoffTimeKey(k)] ?? null }]),
      ) as CutoffRules,
  );

/** A rule as the table holds it: the days alone (the shape before hours were kept) or days and hour. */
const storedRule = z.union([
  z.number().int().min(0).max(30),
  z.object({ days: z.number().int().min(0).max(30), time: z.string().nullable() }),
]);
const storedRules = z.object(
  Object.fromEntries(CUTOFF_KEYS.map((k) => [k, storedRule])) as Record<
    CutoffKey,
    typeof storedRule
  >,
);

/** The table's row as rules; a row from before the hours were kept takes the legacy hour of each closing. */
function rulesOf(value: unknown): CutoffRules {
  const parsed = storedRules.safeParse(value);
  if (!parsed.success) return { ...DEFAULT_CUTOFFS };
  return Object.fromEntries(
    CUTOFF_KEYS.map((k): [CutoffKey, CutoffRule] => {
      const r = parsed.data[k];
      return [k, typeof r === "number" ? { days: r, time: DEFAULT_CUTOFFS[k].time } : r];
    }),
  ) as CutoffRules;
}

/** Days before the ETD and the hour of the day for each closing (a Settings table seeded with the legacy rules). */
export function readCutoffRules(): Promise<CutoffRules> {
  return cached(NAME, { ttlSeconds: 600, tags: [CUTOFF_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    return row ? rulesOf(row.value) : { ...DEFAULT_CUTOFFS };
  });
}

export async function readCutoffRulesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  return {
    rules: row ? rulesOf(row.value) : { ...DEFAULT_CUTOFFS },
    version: row?.version ?? 0,
  };
}
