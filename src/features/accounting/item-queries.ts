import "server-only";
import { asc, isNull } from "drizzle-orm";
import { type LineItemKind, type LineOption, lineOptions } from "@/domain/line-items";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { portCodeOf } from "@/server/port-sql";
import { withRouteWords } from "@/server/route-words";
import { rateItems } from "@/server/db/schema";
import { readLineItems } from "@/server/line-items-config";

/** What a line of a draft can be (legacy itemOptions): the live catalogue, then the general items of that kind. */
export async function lineOptionsFor(kind: LineItemKind): Promise<LineOption[]> {
  await requirePermission("app.accounting");
  const [rates, items] = await Promise.all([
    db
      .select()
      .from(rateItems)
      .where(isNull(rateItems.archivedAt))
      .orderBy(asc(rateItems.category), asc(portCodeOf(rateItems.podId)), asc(rateItems.name)),
    readLineItems(),
  ]);
  return lineOptions(
    kind,
    (await withRouteWords(rates)).map((r) => ({
      id: r.id,
      label: itemLabel(r),
      sellCents: r.sellCents,
      buyCents: r.buyCents,
      vatCode: r.vatCode,
    })),
    items,
  );
}
