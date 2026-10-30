import "server-only";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { certiState, isCertiweight } from "@/domain/certiweight";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { withRouteWords } from "@/server/route-words";
import { quotationLines, rateItems } from "@/server/db/schema";
import { certificateFiled } from "./editor-store";

/** Certiweight on the destination a booking ships: its line, whether filed, the catalogue item. */
export async function certiweightOf(routeId: string) {
  await requirePermission("app.bookings");
  const [lines, [item], filed] = await Promise.all([
    db
      .select({ id: quotationLines.id, description: quotationLines.description })
      .from(quotationLines)
      .where(and(eq(quotationLines.routeId, routeId), isNull(quotationLines.archivedAt))),
    db
      .select()
      .from(rateItems)
      .where(and(isNull(rateItems.archivedAt), ilike(rateItems.name, "%certiweight%")))
      .limit(1),
    certificateFiled(db, routeId),
  ]);
  const line = lines.find((l) => isCertiweight(l.description)) ?? null;
  return {
    state: certiState(!!line, filed),
    lineId: line?.id ?? null,
    item: item
      ? {
          label: itemLabel((await withRouteWords([item]))[0]),
          sellCents: item.sellCents,
          buyCents: item.buyCents,
          id: item.id,
        }
      : null,
  };
}
