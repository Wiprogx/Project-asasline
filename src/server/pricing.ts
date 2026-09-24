import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { itemLabel, latestQuoted, listIsLive, type Price, priceFor } from "@/domain/pricing";
import type { DbOrTx } from "./db/client";
import {
  contacts,
  priceListLines,
  priceLists,
  quotationLines,
  quotationRoutes,
  quotations,
  rateItems,
} from "./db/schema";

type Item = typeof rateItems.$inferSelect;

async function agreedFor(tx: DbOrTx, clientId: string, itemId: string, day: string) {
  const lists = await tx
    .select()
    .from(priceLists)
    .where(and(eq(priceLists.contactId, clientId), isNull(priceLists.archivedAt)));
  const live = lists.find((l) => listIsLive(l, day));
  if (!live) return null;
  const [line] = await tx
    .select()
    .from(priceListLines)
    .where(
      and(
        eq(priceListLines.priceListId, live.id),
        eq(priceListLines.itemId, itemId),
        isNull(priceListLines.archivedAt),
      ),
    );
  return line ? { sellCents: line.sellCents, buyCents: line.buyCents, listName: live.name } : null;
}

/**
 * The prices this customer was quoted for the item on other live quotations. Refs are issued
 * in order (QTyymmNNN), so the highest ref is the latest quotation.
 */
async function quotedBefore(tx: DbOrTx, clientId: string, itemId: string, exceptId?: string) {
  const rows = await tx
    .select({ sell: quotationLines.sellCents, cost: quotationLines.costCents, ref: quotations.ref })
    .from(quotationLines)
    .innerJoin(quotationRoutes, eq(quotationRoutes.id, quotationLines.routeId))
    .innerJoin(quotations, eq(quotations.id, quotationRoutes.quotationId))
    .where(
      and(
        eq(quotations.clientId, clientId),
        ne(quotations.status, "cancelled"),
        exceptId ? ne(quotations.id, exceptId) : undefined,
        eq(quotationLines.itemId, itemId),
        isNull(quotationLines.archivedAt),
      ),
    );
  return latestQuoted(
    rows.map((r) => ({ sellCents: r.sell ?? 0, buyCents: r.cost ?? 0, ref: r.ref, day: "" })),
  );
}

/**
 * An item's price for a customer on a day (legacy priceFor): the agreement in force, else —
 * when the contact is set to it — the last price quoted, else the catalogue.
 */
export async function priceOf(
  tx: DbOrTx,
  q: { clientId: string; itemId: string; day: string; exceptQuotationId?: string },
): Promise<{ item: Item; label: string; price: Price } | null> {
  const [item] = await tx.select().from(rateItems).where(eq(rateItems.id, q.itemId));
  if (!item || item.archivedAt) return null;
  const [client] = await tx
    .select({ usesLastPrice: contacts.usesLastPrice })
    .from(contacts)
    .where(eq(contacts.id, q.clientId));
  const usesLastPrice = client?.usesLastPrice ?? false;
  const [agreed, last] = await Promise.all([
    agreedFor(tx, q.clientId, item.id, q.day),
    usesLastPrice ? quotedBefore(tx, q.clientId, item.id, q.exceptQuotationId) : null,
  ]);
  return { item, label: itemLabel(item), price: priceFor({ item, agreed, usesLastPrice, last }) };
}
