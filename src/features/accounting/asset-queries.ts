import "server-only";
import { asc, eq, isNull } from "drizzle-orm";
import { assetBook, lastMonthEnd } from "@/domain/assets";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { contacts, fixedAssets, invoices } from "@/server/db/schema";

/** Every asset with what is depreciated so far (through the last finished month). */
export async function assetsScreen(today: string) {
  await requirePermission("app.accounting");
  const rows = await db
    .select({ asset: fixedAssets, bill: invoices.number, supplier: contacts.name })
    .from(fixedAssets)
    .innerJoin(invoices, eq(invoices.id, fixedAssets.invoiceId))
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .where(isNull(fixedAssets.archivedAt))
    .orderBy(asc(fixedAssets.acquiredOn));
  const upTo = lastMonthEnd(today);
  return rows.map((r) => ({ ...r, ...assetBook(r.asset, upTo) }));
}
