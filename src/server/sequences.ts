import { sql } from "drizzle-orm";
import { formatRef, type RefPrefix, sequenceKey } from "@/domain/refs";
import type { Tx } from "./db/client";
import { sequences } from "./db/schema";

/**
 * Issues the next QT/SB number for the month of `day`, atomically.
 *
 * The upsert takes a row lock, so two staff creating a booking in the same second get two
 * different numbers; the legacy app had to detect and renumber collisions after the fact.
 * Call inside the transaction that inserts the record, so a failed insert never burns a
 * number and archived records keep theirs.
 */
export async function nextRef(tx: Tx, prefix: RefPrefix, day: string): Promise<string> {
  const key = sequenceKey(prefix, day);
  const [row] = await tx
    .insert(sequences)
    .values({ key, value: 1 })
    .onConflictDoUpdate({ target: sequences.key, set: { value: sql`${sequences.value} + 1` } })
    .returning({ value: sequences.value });
  return formatRef(prefix, day, row.value);
}
