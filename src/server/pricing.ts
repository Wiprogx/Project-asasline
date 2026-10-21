import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { addDays } from "@/domain/dates";
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

/**
 * A price saved to the customer's agreement (legacy setAgreedPrice): into the agreement in force
 * today, else a new one from today — ending the day before the customer's next agreement, so two
 * never overlap. The item's agreed price is set, or replaced. Returns the agreement's name.
 */
export async function saveAgreedPrice(
  tx: DbOrTx,
  p: {
    clientId: string;
    itemId: string;
    sellCents: number;
    buyCents: number;
    day: string;
    userId: string;
  },
): Promise<string> {
  const lists = await tx
    .select()
    .from(priceLists)
    .where(and(eq(priceLists.contactId, p.clientId), isNull(priceLists.archivedAt)));
  let list = lists.find((l) => listIsLive(l, p.day));
  if (!list) {
    const [client] = await tx
      .select({ name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, p.clientId));
    const next = lists
      .filter((l) => l.active && l.validFrom && l.validFrom > p.day)
      .map((l) => l.validFrom!)
      .sort()[0];
    [list] = await tx
      .insert(priceLists)
      .values({
        contactId: p.clientId,
        name: `${client?.name ?? "Customer"} — agreed prices`,
        validFrom: p.day,
        validUntil: next ? addDays(next, -1) : null,
        createdBy: p.userId,
        updatedBy: p.userId,
      })
      .returning();
  }
  const [line] = await tx
    .select({ id: priceListLines.id })
    .from(priceListLines)
    .where(
      and(
        eq(priceListLines.priceListId, list.id),
        eq(priceListLines.itemId, p.itemId),
        isNull(priceListLines.archivedAt),
      ),
    );
  if (line)
    await tx
      .update(priceListLines)
      .set({
        sellCents: p.sellCents,
        buyCents: p.buyCents,
        updatedBy: p.userId,
        updatedAt: new Date(),
      })
      .where(eq(priceListLines.id, line.id));
  else
    await tx.insert(priceListLines).values({
      priceListId: list.id,
      itemId: p.itemId,
      sellCents: p.sellCents,
      buyCents: p.buyCents,
      createdBy: p.userId,
    });
  return list.name;
}
