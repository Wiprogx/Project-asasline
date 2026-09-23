import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { sepaBatches, users } from "@/server/db/schema";
import { payableBills } from "./sepa-store";

/** What can be paid now, and the files already made. */
export async function sepaScreen() {
  await requirePermission("app.accounting");
  const [bills, batches] = await Promise.all([
    payableBills(db),
    db
      .select({
        batch: sepaBatches,
        by: users.name,
        count: sql<number>`(select count(*) from sepa_batch_items i where i.batch_id = ${sepaBatches.id})::int`,
      })
      .from(sepaBatches)
      .leftJoin(users, eq(users.id, sepaBatches.createdBy))
      .orderBy(desc(sepaBatches.createdAt))
      .limit(50),
  ]);
  return { bills, batches };
}

/** A file as it was made, to download again. */
export async function sepaFile(id: string) {
  await requirePermission("app.accounting");
  const [b] = await db
    .select({ xml: sepaBatches.xml, executionDate: sepaBatches.executionDate })
    .from(sepaBatches)
    .where(eq(sepaBatches.id, id));
  return b ?? null;
}
