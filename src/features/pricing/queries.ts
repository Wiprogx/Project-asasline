import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { PROFESSION_CODES } from "@/domain/lookup-tables";
import { portHint } from "@/domain/ports";
import { itemLabel } from "@/domain/pricing";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { portCodeOf, portMatches } from "@/server/port-sql";
import { livePorts } from "@/server/ports";
import { withRouteWords } from "@/server/route-words";
import { readCountries } from "@/server/countries";
import { liveLookups } from "@/server/lookups";
import { contacts, priceListLines, priceLists, rateItems } from "@/server/db/schema";
import { auditAccess } from "@/server/access";

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
              sql`exists (select 1 from contacts c where c.id = ${rateItems.carrierId} and c.name ilike ${like})`,
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

/**
 * The contacts the catalogue picks a carrier from (legacy carrierNames / truckerOptions): the
 * shipping lines for an ocean leg, the truckers for an inland move — by the profession's code,
 * so renaming the profession changes nothing.
 */
export async function carrierChoices() {
  await requirePermission("catalogue.edit");
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      // Spelled out: from one table Drizzle drops the prefix, and "id" would be the join row's.
      codes: sql<string[]>`coalesce((select array_agg(p.code) from contact_professions j
        join professions p on p.id = j.profession_id
        where j.contact_id = "contacts"."id" and j.archived_at is null and p.code is not null), '{}')`,
    })
    .from(contacts)
    .where(and(isNull(contacts.archivedAt), eq(contacts.type, "company")))
    .orderBy(asc(contacts.name));
  const of = (code: string) =>
    rows.filter((r) => r.codes.includes(code)).map((r) => ({ value: r.id, label: r.name }));
  return { carriers: of(PROFESSION_CODES.carrier), truckers: of(PROFESSION_CODES.transporter) };
}

/** What the catalogue form picks from: ports, countries, boxes, shipping lines and truckers. */
export async function catalogueLists() {
  await requirePermission("catalogue.edit");
  const [ports, countries, boxes, carriers] = await Promise.all([
    livePorts(),
    readCountries(),
    liveLookups("container-types"),
    carrierChoices(),
  ]);
  return {
    ports: ports.map((p) => ({ value: p.code, label: portHint(p), code: p.code })),
    countries: countries
      .filter((c) => !c.archived)
      .map((c) => ({ value: c.code, label: c.name, code: c.code })),
    containerTypes: boxes.map((b) => b.label),
    ...carriers,
  };
}
