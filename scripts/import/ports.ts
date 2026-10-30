/**
 * A legacy port, as the words a record held: its UN/LOCODE, the one port of that name (or other
 * name), or a legacy "Name (CODE)". A code the table lacks becomes a row to complete in
 * Settings › Ports; words that name no port are left off, with a warning.
 */
import { eq, sql } from "drizzle-orm";
import { portCode } from "../../src/domain/ports";
import type { DbOrTx } from "../../src/server/db/client";
import { ports } from "../../src/server/db/schema";

async function byName(tx: DbOrTx, words: string) {
  const rows = await tx
    .select({ id: ports.id })
    .from(ports)
    .where(
      sql`lower(${ports.name}) = lower(${words}) or lower(${words}) = any (select lower(a) from unnest(${ports.aliases}) a)`,
    )
    .limit(2);
  return rows.length === 1 ? rows[0].id : null;
}

async function byCode(tx: DbOrTx, code: string, add: boolean) {
  const [row] = await tx.select({ id: ports.id }).from(ports).where(eq(ports.code, code));
  if (row || !add) return row?.id ?? null;
  const [made] = await tx
    .insert(ports)
    .values({
      code,
      name: code,
      country: code.slice(0, 2),
      notes: "Added by the legacy import: give it its name.",
    })
    .returning({ id: ports.id });
  return made.id;
}

export async function importPortId(
  tx: DbOrTx,
  words: unknown,
  warn: (w: string) => void,
): Promise<string | null> {
  const text = typeof words === "string" ? words.trim() : "";
  if (!text) return null;
  const code = portCode(text);
  const inBrackets = portCode(/\(([^)]+)\)\s*$/.exec(text)?.[1]);
  const id =
    (code && (await byCode(tx, code, false))) ||
    (await byName(tx, text)) ||
    (inBrackets && (await byCode(tx, inBrackets, false))) ||
    (code && (await byCode(tx, code, true)));
  if (!id) warn(`port "${text}" is not a UN/LOCODE or a port of Settings › Ports — left off`);
  return id || null;
}
