import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { readRateCategories } from "@/server/catalogue-config";
import { db } from "@/server/db/client";
import { contacts, priceListLines, priceLists, rateItems } from "@/server/db/schema";

export async function rateCategories() {
  await requirePermission("catalogue.edit");
  return readRateCategories();
}

/** The catalogue, by category then destination; archived items only when asked for. */
export async function listRateItems(opts: { q?: string; category?: string; archived?: boolean }) {
  await requirePermission("catalogue.edit");
  const q = opts.q?.trim();
  const like = `%${q}%`;
  const rows = await db
    .select()
    .from(rateItems)
    .where(
      and(
        opts.archived ? isNotNull(rateItems.archivedAt) : isNull(rateItems.archivedAt),
        opts.category ? eq(rateItems.category, opts.category) : undefined,
        q
          ? or(
              ilike(rateItems.name, like),
              ilike(rateItems.pol, like),
              ilike(rateItems.pod, like),
              ilike(rateItems.carrier, like),
              ilike(rateItems.docCode, like),
              ilike(rateItems.country, like),
              ilike(rateItems.toPlace, like),
            )
          : undefined,
      ),
    )
    .orderBy(asc(rateItems.category), asc(rateItems.pod), asc(rateItems.name))
    .limit(500);
  return rows.map((it) => ({ ...it, label: itemLabel(it) }));
}

export async function getRateItem(id: string) {
  await requirePermission("catalogue.edit");
  const [it] = await db.select().from(rateItems).where(eq(rateItems.id, id));
  return it ? { ...it, label: itemLabel(it) } : null;
}

/** Items still in use, for a picker. */
export async function rateItemOptions() {
  await requirePermission("catalogue.edit");
  const rows = await db
    .select()
    .from(rateItems)
    .where(isNull(rateItems.archivedAt))
    .orderBy(asc(rateItems.category), asc(rateItems.pod), asc(rateItems.name));
  return rows.map((it) => ({ value: it.id, label: `${itemLabel(it)} · ${it.category}` }));
}

/** Agreements, newest first; for one customer when `contactId` is given. */
export async function listPriceLists(opts: { contactId?: string } = {}) {
  await requirePermission("catalogue.edit");
  return db
    .select({ list: priceLists, contact: contacts.name })
    .from(priceLists)
    .innerJoin(contacts, eq(contacts.id, priceLists.contactId))
    .where(
      and(
        isNull(priceLists.archivedAt),
        opts.contactId ? eq(priceLists.contactId, opts.contactId) : undefined,
      ),
    )
    .orderBy(asc(contacts.name), desc(priceLists.validFrom))
    .limit(500);
}

export async function getPriceList(id: string) {
  await requirePermission("catalogue.edit");
  const list = await db.query.priceLists.findFirst({
    where: eq(priceLists.id, id),
    with: {
      contact: { columns: { id: true, name: true } },
      lines: {
        where: isNull(priceListLines.archivedAt),
        with: { item: true },
        orderBy: asc(priceListLines.createdAt),
      },
    },
  });
  if (!list) return null;
  return {
    ...list,
    lines: list.lines.map((l) => ({ ...l, label: itemLabel(l.item) })),
  };
}
