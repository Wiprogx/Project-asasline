import "server-only";
import { eq, sql } from "drizzle-orm";
import { type LineMemory, memoryKey } from "@/domain/line-memory";
import type { DbOrTx } from "@/server/db/client";
import { billLineMemory } from "@/server/db/schema";

// Internal to the bills: called after the action's permission check.

/** What the office booked each line on, kept for the supplier's next bill (legacy lineMem). */
export async function rememberLines(
  tx: DbOrTx,
  contactId: string,
  lines: readonly { description: string; account: string }[],
  userId: string,
) {
  const seen = new Set<string>();
  for (const l of lines) {
    const key = memoryKey(l.description);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    await tx
      .insert(billLineMemory)
      .values({ contactId, key, account: l.account, updatedBy: userId })
      .onConflictDoUpdate({
        target: [billLineMemory.contactId, billLineMemory.key],
        set: { account: l.account, updatedAt: sql`now()`, updatedBy: userId },
      });
  }
}

/** The supplier's memory, as the domain reads it. */
export async function memoryOf(tx: DbOrTx, contactId: string): Promise<LineMemory[]> {
  return tx
    .select({ key: billLineMemory.key, account: billLineMemory.account })
    .from(billLineMemory)
    .where(eq(billLineMemory.contactId, contactId));
}
