import "server-only";
import { and, asc, inArray, isNull } from "drizzle-orm";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { withRouteWords } from "@/server/route-words";
import { rateItems } from "@/server/db/schema";

/** The categories a charge raised from a booking comes from (legacy: other and free time). */
const CHARGE_CATEGORIES = ["other", "freetime"];

/** What can be charged from a booking: the live catalogue items of those categories. */
export async function chargeItems() {
  await requirePermission("app.bookings");
  const rows = await db
    .select()
    .from(rateItems)
    .where(and(isNull(rateItems.archivedAt), inArray(rateItems.category, CHARGE_CATEGORIES)))
    .orderBy(asc(rateItems.category), asc(rateItems.name));
  const named = await withRouteWords(rows);
  return named.map((r) => ({
    id: r.id,
    label: itemLabel(r),
    sellCents: r.sellCents,
    buyCents: r.buyCents,
  }));
}
