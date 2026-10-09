import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_LOADING_MODES, type LoadingMode } from "@/domain/loading";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "loadingModes";
export const LOADING_MODES_TAG = `config:${NAME}`;

export const loadingModesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(80),
      hours: z.number().int().min(0).max(48),
      drop: z.boolean(),
      surcharge: z.string().trim().min(1).max(200).nullable(),
      qty: z.number().int().min(0).max(50),
    }),
  )
  .min(1)
  .max(60);

const fallback = () => DEFAULT_LOADING_MODES.map((m) => ({ ...m }));

export async function readLoadingModesForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? loadingModesSchema.safeParse(row.value) : null;
  return { modes: parsed?.success ? parsed.data : fallback(), version: row?.version ?? 0 };
}

/** The agreed loading modes (legacy LOADING_MODES): a Settings table, the built-in list until saved. */
export function readLoadingModes(): Promise<LoadingMode[]> {
  return cached(NAME, { ttlSeconds: 600, tags: [LOADING_MODES_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? loadingModesSchema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : fallback();
  });
}
