import { and, eq, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { DbOrTx } from "./db/client";

/** A colleague saved the record after it was read; the caller shows "use theirs / keep mine". */
export class ConflictError extends Error {
  constructor(public readonly entity: string) {
    super(`${entity} was changed by someone else. Reload to see their version.`);
  }
}

type Versioned = PgTable & { id: PgColumn; version: PgColumn; updatedAt: PgColumn };

/**
 * Optimistic concurrency: the update only lands if the row still has the version the user
 * read, and bumps it. Zero rows means someone else won — never a silent overwrite.
 */
export async function updateVersioned<T extends Versioned>(
  db: DbOrTx,
  table: T,
  id: string,
  expectedVersion: number,
  values: Record<string, unknown>,
  entity: string,
): Promise<void> {
  const rows = await db
    .update(table)
    .set({ ...values, version: sql`${table.version} + 1`, updatedAt: new Date() } as never)
    .where(and(eq(table.id, id), eq(table.version, expectedVersion)))
    .returning({ id: table.id });
  if (rows.length === 0) throw new ConflictError(entity);
}
