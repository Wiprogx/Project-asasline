import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { type Permission, type PermissionMatrix, PERMISSIONS } from "@/domain/permissions";
import { cached } from "./cache/cache";
import { db } from "./db/client";
import { configTables } from "./db/schema";

const NAME = "permissions";
export const PERMISSIONS_TAG = `config:${NAME}`;

const bit = z.union([z.literal(0), z.literal(1)]);
export const permissionsSchema = z.record(z.string(), z.tuple([bit, bit, bit, bit]));

/** A saved matrix over the defaults: a permission added since the save keeps its default. */
const merged = (saved: Record<string, readonly [0 | 1, 0 | 1, 0 | 1, 0 | 1]>): PermissionMatrix =>
  Object.fromEntries(
    (Object.keys(PERMISSIONS) as Permission[]).map((p) => [p, saved[p] ?? PERMISSIONS[p]]),
  ) as PermissionMatrix;

/** The permission matrix (legacy perms): the Settings table over the built-in defaults. */
export function readPermissions(): Promise<PermissionMatrix> {
  return cached(NAME, { ttlSeconds: 600, tags: [PERMISSIONS_TAG] }, async () => {
    const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
    const parsed = row ? permissionsSchema.safeParse(row.value) : null;
    return parsed?.success ? merged(parsed.data) : { ...PERMISSIONS };
  });
}

export async function readPermissionsForEdit() {
  const [row] = await db.select().from(configTables).where(eq(configTables.name, NAME));
  const parsed = row ? permissionsSchema.safeParse(row.value) : null;
  return {
    matrix: parsed?.success ? merged(parsed.data) : { ...PERMISSIONS },
    version: row?.version ?? 0,
  };
}
