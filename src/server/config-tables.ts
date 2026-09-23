import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { DEFAULT_CANCEL_REASONS } from "@/domain/shipments";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

/**
 * Editable lists (legacy STORE_CONFIG). Each table has a schema and a built-in default; the
 * row in `config_tables` wins once Settings has saved one. Unknown shapes fall back to the
 * default rather than crash a screen — and are logged, because that is a bug.
 */
const TABLES = {
  cancelReasons: { schema: z.array(z.string().min(1)), fallback: DEFAULT_CANCEL_REASONS },
  containerTypes: {
    schema: z.array(z.string().min(1)),
    fallback: ["20DV", "40DV", "40HC", "45HC", "20RF", "40RF"],
  },
} as const;

export type ConfigName = keyof typeof TABLES;

/** Every table today is a list of labels; a richer table gets its own reader and schema. */
export async function readConfig(name: ConfigName): Promise<string[]> {
  const def = TABLES[name];
  return cached(`config:${name}`, { ttlSeconds: 600, tags: [`config:${name}`] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, name)).limit(1);
    if (!row) return [...def.fallback];
    const parsed = def.schema.safeParse(row.value);
    if (!parsed.success) {
      console.error(
        `[config] ${name} has an invalid shape; using the default`,
        parsed.error.issues,
      );
      return [...def.fallback];
    }
    return parsed.data;
  });
}
