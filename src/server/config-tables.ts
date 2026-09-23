import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ADDRESS_TYPES } from "@/domain/contacts";
import { DEFAULT_CANCEL_REASONS } from "@/domain/shipments";
import { cached, invalidateTags } from "./cache/cache";
import { db, type Tx } from "./db/client";
import { configTables } from "./db/schema";
import { ConflictError } from "./versioned";

/**
 * Editable lists (legacy STORE_CONFIG). Each table has a schema and a built-in default; the
 * row in `config_tables` wins once Settings has saved one. Unknown shapes fall back to the
 * default rather than crash a screen — and are logged, because that is a bug.
 */
const LIST = z.array(z.string().min(1).max(200)).min(1).max(500);

const TABLES = {
  cancelReasons: { schema: LIST, fallback: DEFAULT_CANCEL_REASONS },
  containerTypes: { schema: LIST, fallback: ["20DV", "40DV", "40HC", "45HC", "20RF", "40RF"] },
  addressTypes: { schema: LIST, fallback: ADDRESS_TYPES },
} as const;

export type ConfigName = keyof typeof TABLES;
export const CONFIG_NAMES = Object.keys(TABLES) as ConfigName[];

const tag = (name: ConfigName) => `config:${name}`;

function parse(name: ConfigName, value: unknown): string[] {
  const parsed = TABLES[name].schema.safeParse(value);
  if (parsed.success) return parsed.data;
  console.error(`[config] ${name} has an invalid shape; using the default`, parsed.error.issues);
  return [...TABLES[name].fallback];
}

/** Every table today is a list of labels; a richer table gets its own reader and schema. */
export async function readConfig(name: ConfigName): Promise<string[]> {
  return cached(`config:${name}`, { ttlSeconds: 600, tags: [tag(name)] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, name)).limit(1);
    return row ? parse(name, row.value) : [...TABLES[name].fallback];
  });
}

/** For an editor: the live value and the version it must send back. Version 0 = never saved. */
export async function readConfigForEdit(name: ConfigName) {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, name)).limit(1);
  return row
    ? { values: parse(name, row.value), version: row.version }
    : { values: [...TABLES[name].fallback], version: 0 };
}

/** Validates against the table's schema; returns the problem, or null. */
export function configProblem(name: ConfigName, values: string[]): string | null {
  const r = TABLES[name].schema.safeParse(values);
  return r.success ? null : "A list needs at least one entry, each under 200 characters.";
}

/** Optimistic write: the first save inserts (version 0), later saves need the version read. */
export async function writeConfig(
  tx: Tx,
  name: ConfigName,
  values: string[],
  expectedVersion: number,
  userId: string,
): Promise<void> {
  if (expectedVersion === 0) {
    const rows = await tx
      .insert(configTables)
      .values({ name, value: values, updatedBy: userId })
      .onConflictDoNothing()
      .returning({ name: configTables.name });
    if (rows.length === 0) throw new ConflictError("This list");
    return;
  }
  const rows = await tx
    .update(configTables)
    .set({
      value: values,
      version: sql`${configTables.version} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(and(eq(configTables.name, name), eq(configTables.version, expectedVersion)))
    .returning({ name: configTables.name });
  if (rows.length === 0) throw new ConflictError("This list");
}

export const invalidateConfig = (name: ConfigName) => invalidateTags(tag(name));
