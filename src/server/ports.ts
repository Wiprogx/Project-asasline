import "server-only";
import { asc, eq, inArray, isNull } from "drizzle-orm";
import type { Port } from "@/domain/ports";
import { cached, invalidateTags } from "./cache/cache";
import { db, type DbOrTx } from "./db/client";
import { ports } from "./db/schema";

export const PORTS_TAG = "ports";

/** The live ports, offered on every port field as the person types (the office datalist). */
export function livePorts(): Promise<Port[]> {
  return cached("ports:live", { ttlSeconds: 600, tags: [PORTS_TAG] }, () =>
    db
      .select({
        code: ports.code,
        name: ports.name,
        country: ports.country,
        preClearance: ports.preClearance,
      })
      .from(ports)
      .where(isNull(ports.archivedAt))
      .orderBy(asc(ports.code)),
  );
}

/**
 * The codes of these ports by id, archived ones too (a record keeps pointing at its port): from
 * the cached table, and one it lacks — added in the caller's transaction — read through `tx`.
 */
async function portCodes(tx: DbOrTx, ids: readonly string[]): Promise<Map<string, string>> {
  const rows = await cached("ports:codes", { ttlSeconds: 600, tags: [PORTS_TAG] }, () =>
    db.select({ id: ports.id, code: ports.code }).from(ports),
  );
  const codes = new Map(rows.map((r) => [r.id, r.code]));
  const missing = [...new Set(ids)].filter((id) => !codes.has(id));
  if (missing.length) {
    const fresh = await tx
      .select({ id: ports.id, code: ports.code })
      .from(ports)
      .where(inArray(ports.id, missing));
    for (const r of fresh) codes.set(r.id, r.code);
  }
  return codes;
}

type WithPortIds = { polId: string | null; podId: string | null };

/** Rows with their ports' codes added as `pol` and `pod`, so the domain reads them as it always has. */
export async function withPorts<T extends WithPortIds>(
  rows: readonly T[],
  tx: DbOrTx = db,
): Promise<(T & { pol: string | null; pod: string | null })[]> {
  const ids = rows.flatMap((r) => [r.polId, r.podId]).filter((id): id is string => !!id);
  const codes = await portCodes(tx, ids);
  const code = (id: string | null) => (id ? (codes.get(id) ?? null) : null);
  return rows.map((r) => ({ ...r, pol: code(r.polId), pod: code(r.podId) }));
}

/**
 * The port a typed UN/LOCODE names; a code the table lacks is added as a row to complete in
 * Settings › Ports (the table suggests, it does not refuse a real code). Null for no code.
 */
export async function portId(tx: DbOrTx, code: string, userId: string): Promise<string>;
export async function portId(
  tx: DbOrTx,
  code: string | null | undefined,
  userId: string,
): Promise<string | null>;
export async function portId(tx: DbOrTx, code: string | null | undefined, userId: string) {
  if (!code) return null;
  const [row] = await tx.select({ id: ports.id }).from(ports).where(eq(ports.code, code));
  if (row) return row.id;
  const [made] = await tx
    .insert(ports)
    .values({
      code,
      name: code,
      country: code.slice(0, 2),
      notes: "Added from a record: give it its name.",
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoUpdate({ target: ports.code, set: { code } })
    .returning({ id: ports.id });
  await invalidateTags(PORTS_TAG);
  return made.id;
}

/** A record's two ports by their typed codes. */
export async function portIds(
  tx: DbOrTx,
  codes: { pol?: string | null; pod?: string | null },
  userId: string,
) {
  return {
    polId: await portId(tx, codes.pol, userId),
    podId: await portId(tx, codes.pod, userId),
  };
}

/** After a write to the ports table: the port fields and the records' codes read it again. */
export const invalidatePorts = () => invalidateTags(PORTS_TAG);
