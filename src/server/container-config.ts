import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { CONTAINER_SPECS } from "@/domain/container";
import { type BoxOwner, type ContainerSpec, DEFAULT_BOX_OWNERS } from "@/domain/lookups";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

/** Two small tables of the same shape: a name, a schema, a default. */
type Table<T> = { name: string; schema: z.ZodType<T[]>; fallback: () => T[] };

export const boxOwnersSchema = z
  .array(
    z.object({ prefix: z.string().regex(/^[A-Z]{4}$/), owner: z.string().trim().min(1).max(60) }),
  )
  .max(500);
export const containerSpecsSchema = z
  .array(
    z.object({
      type: z.string().regex(/^[A-Z0-9]{2,10}$/),
      tareKg: z.number().int().min(1).max(20_000),
      maxGrossKg: z.number().int().min(1).max(100_000),
    }),
  )
  .min(1)
  .max(60);

const OWNERS: Table<BoxOwner> = {
  name: "boxOwners",
  schema: boxOwnersSchema,
  fallback: () => DEFAULT_BOX_OWNERS.map((o) => ({ ...o })),
};
const SPECS: Table<ContainerSpec> = {
  name: "containerSpecs",
  schema: containerSpecsSchema,
  fallback: () => Object.entries(CONTAINER_SPECS).map(([type, s]) => ({ type, ...s })),
};
export const BOX_OWNERS_TAG = `config:${OWNERS.name}`;
export const CONTAINER_SPECS_TAG = `config:${SPECS.name}`;

async function readForEdit<T>(t: Table<T>) {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, t.name));
  const parsed = row ? t.schema.safeParse(row.value) : null;
  return { rows: parsed?.success ? parsed.data : t.fallback(), version: row?.version ?? 0 };
}

const read = <T>(t: Table<T>) =>
  cached(t.name, { ttlSeconds: 600, tags: [`config:${t.name}`] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, t.name));
    const parsed = row ? t.schema.safeParse(row.value) : null;
    return parsed?.success ? parsed.data : t.fallback();
  });

/** Who owns a box by its prefix (legacy BOX_OWNERS). */
export const readBoxOwners = () => read(OWNERS);
/** Tare and maximum gross per ISO type (legacy CONTAINER_TARE / CONTAINER_MAX). */
export const readContainerSpecs = () => read(SPECS);
export const readBoxOwnersForEdit = () => readForEdit(OWNERS);
export const readContainerSpecsForEdit = () => readForEdit(SPECS);
