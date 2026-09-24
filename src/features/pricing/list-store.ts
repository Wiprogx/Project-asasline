import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { periodsOverlap } from "@/domain/pricing";
import type { ActionResult } from "@/lib/action-result";
import type { DbOrTx } from "@/server/db/client";
import { priceLists } from "@/server/db/schema";

/**
 * Two live agreements for one customer on the same day would make the price depend on which
 * one the database returns first (legacy `find` did exactly that); the second is refused.
 */
export async function overlappingList(
  tx: DbOrTx,
  d: {
    contactId: string;
    validFrom: string | null;
    validUntil: string | null;
    active: boolean;
    exceptId?: string;
  },
): Promise<ActionResult | null> {
  if (!d.active) return null;
  const others = await tx
    .select()
    .from(priceLists)
    .where(
      and(
        eq(priceLists.contactId, d.contactId),
        eq(priceLists.active, true),
        isNull(priceLists.archivedAt),
        d.exceptId ? ne(priceLists.id, d.exceptId) : undefined,
      ),
    );
  const clash = others.find((o) => periodsOverlap(o, d));
  if (!clash) return null;
  const msg = `"${clash.name}" already covers these days (${clash.validFrom ?? "…"} → ${clash.validUntil ?? "open"}). Change its dates or switch one off.`;
  return { ok: false, error: msg, fieldErrors: { validFrom: [msg] } };
}
