import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ACCESS_KEYS, type AccessWatch, DEFAULT_ACCESS_WATCH } from "@/domain/access";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "accessWatch";
export const ACCESS_WATCH_TAG = `config:${NAME}`;

export const accessWatchSchema = z
  .array(z.object({ key: z.enum(ACCESS_KEYS), label: z.string().min(1).max(80), on: z.boolean() }))
  .max(20);

const fallback = (): AccessWatch[] => DEFAULT_ACCESS_WATCH.map((w) => ({ ...w }));

/** Which acts of looking are recorded (legacy ACCESS_WATCH): the Settings table, the legacy five until saved. */
export const readAccessWatch = () =>
  cached(NAME, { ttlSeconds: 600, tags: [ACCESS_WATCH_TAG] }, async (): Promise<AccessWatch[]> => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? accessWatchSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });

export async function readAccessWatchForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? accessWatchSchema.safeParse(row.value) : null;
  return { watch: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}
