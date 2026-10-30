import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { readRateCategories, readRateCategoriesForEdit } from "@/server/catalogue-config";
import { db } from "@/server/db/client";
import { portCodeOf, portMatches } from "@/server/port-sql";
import { withRouteWords } from "@/server/route-words";
import { contacts, priceListLines, priceLists, rateItems } from "@/server/db/schema";
import { auditAccess } from "@/server/access";

export async function rateCategories() {
  await requirePermission("catalogue.edit");
  return readRateCategories();
}

export async function rateCategoriesForEdit() {
  await requirePermission("app.settings");
  return readRateCategoriesForEdit();
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
              portMatches(rateItems.polId, like),
              portMatches(rateItems.podId, like),
              ilike(rateItems.carrier, like),
              ilike(rateItems.docCode, like),
              ilike(rateItems.country, like),
              ilike(rateItems.toPlace, like),
            )
          : undefined,
      ),
    )
    .orderBy(asc(rateItems.category), asc(portCodeOf(rateItems.podId)), asc(rateItems.name))
    .limit(500);
  const named = await withRouteWords(rows);
  return named.map((it) => ({ ...it, label: itemLabel(it) }));
}

export async function getRateItem(id: string) {
  await requirePermission("catalogue.edit");
  const [row] = await db.select().from(rateItems).where(eq(rateItems.id, id));
  if (!row) return null;
  const [it] = await withRouteWords([row]);
  return { ...it, label: itemLabel(it) };
}

/** Items still in use, for a picker. */
export async function rateItemOptions() {
  await requirePermission("catalogue.edit");
  const rows = await db
    .select()
    .from(rateItems)
    .where(isNull(rateItems.archivedAt))
    .orderBy(asc(rateItems.category), asc(portCodeOf(rateItems.podId)), asc(rateItems.name));
  const named = await withRouteWords(rows);
  return named.map((it) => ({ value: it.id, label: `${itemLabel(it)} · ${it.category}` }));
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
  const user = await requirePermission("catalogue.edit");
  // A customer's prices are sensitive when the office says so (Settings › Audit log).
  await auditAccess("price", {
    action: "pricelist.view",
    userId: user.id,
    entity: "priceList",
    entityId: id,
  });
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
    lines: await Promise.all(
      list.lines.map(async (l) => {
        const [item] = await withRouteWords([l.item]);
        return { ...l, label: itemLabel(item) };
      }),
    ),
  };
}
