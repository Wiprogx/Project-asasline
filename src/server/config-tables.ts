import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Tx } from "./db/client";
import { configTables } from "./db/schema";
import { ConflictError } from "./versioned";

/**
 * The structured Settings tables kept as one JSON row each (legacy STORE_CONFIG): the rule book,
 * the routing, the templates… The office's word lists are tables of their own (schema/lists,
 * server/lookups), no longer rows here.
 */

/**
 * Optimistic write of any Settings table: the first save inserts (version 0), later saves
 * need the version the editor read. A stale version is a ConflictError, never an overwrite.
 */
export async function writeTable(
  tx: Tx,
  name: string,
  value: unknown,
  expectedVersion: number,
  userId: string,
): Promise<void> {
  if (expectedVersion === 0) {
    const rows = await tx
      .insert(configTables)
      .values({ name, value, updatedBy: userId })
      .onConflictDoNothing()
      .returning({ name: configTables.name });
    if (rows.length === 0) throw new ConflictError("This table");
    return;
  }
  const rows = await tx
    .update(configTables)
    .set({
      value,
      version: sql`${configTables.version} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(and(eq(configTables.name, name), eq(configTables.version, expectedVersion)))
    .returning({ name: configTables.name });
  if (rows.length === 0) throw new ConflictError("This table");
}
