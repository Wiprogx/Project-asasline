import "server-only";
import { desc, isNull } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { journalEntries } from "@/server/db/schema";

/** The entries written by hand, newest first, each with the reversal that undid it, if any. */
export async function listEntries() {
  await requirePermission("app.accounting");
  const rows = await db
    .select()
    .from(journalEntries)
    .where(isNull(journalEntries.archivedAt))
    .orderBy(desc(journalEntries.date), desc(journalEntries.ref))
    .limit(500);
  const undoneBy = new Map(rows.filter((r) => r.reversalOf).map((r) => [r.reversalOf!, r.ref]));
  return rows.map((r) => ({ ...r, reversedBy: undoneBy.get(r.id) ?? null }));
}
