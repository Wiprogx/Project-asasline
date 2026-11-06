import "server-only";
import { and, asc, inArray, isNull } from "drizzle-orm";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { rateItems } from "@/server/db/schema";

/** The categories a loading mode's surcharge comes from (legacy: waiting time, re-positioning). */
const SURCHARGE_CATEGORIES = ["other", "freetime"];

/** The catalogue items a loading mode may charge on top, by name, for the Settings list. */
export async function surchargeItemNames(): Promise<string[]> {
  await requirePermission("app.settings");
  const rows = await db
    .select({ name: rateItems.name })
    .from(rateItems)
    .where(and(isNull(rateItems.archivedAt), inArray(rateItems.category, SURCHARGE_CATEGORIES)))
    .orderBy(asc(rateItems.name));
  return [...new Set(rows.map((r) => r.name).filter((n): n is string => !!n))];
}
