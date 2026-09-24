import "server-only";
import { asc, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { itemLabel } from "@/domain/pricing";
import type { QuotationStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import {
  contacts,
  quotationLines,
  quotationRoutes,
  quotations,
  rateItems,
} from "@/server/db/schema";

export type QuotationRow = {
  id: string;
  ref: string;
  status: QuotationStatus;
  clientName: string;
  validUntil: string | null;
};

export async function listQuotations(opts: { q?: string } = {}) {
  await requirePermission("app.quotations");
  const q = opts.q?.trim() ?? "";
  return cached(
    `quotations:list:${q.toLowerCase()}`,
    { ttlSeconds: 30, tags: [tags.quotations] },
    (): Promise<QuotationRow[]> => {
      const like = `%${q}%`;
      return db
        .select({
          id: quotations.id,
          ref: quotations.ref,
          status: quotations.status,
          clientName: contacts.name,
          validUntil: quotations.validUntil,
        })
        .from(quotations)
        .innerJoin(contacts, eq(contacts.id, quotations.clientId))
        .where(q ? or(ilike(quotations.ref, like), ilike(contacts.name, like)) : undefined)
        .orderBy(desc(quotations.ref))
        .limit(500);
    },
  );
}

export async function getQuotation(id: string) {
  await requirePermission("app.quotations");
  return db.query.quotations.findFirst({
    where: eq(quotations.id, id),
    with: {
      client: { columns: { id: true, name: true } },
      bookings: { columns: { id: true, ref: true, status: true, quotationRouteId: true } },
      routes: {
        orderBy: asc(quotationRoutes.position),
        with: {
          lines: {
            where: isNull(quotationLines.archivedAt),
            orderBy: [asc(quotationLines.position), asc(quotationLines.createdAt)],
          },
        },
      },
    },
  });
}

/** The catalogue as the quotation editor offers it: ocean legs for a destination, all for a line. */
export async function catalogueChoices() {
  await requirePermission("app.quotations");
  const rows = await db
    .select()
    .from(rateItems)
    .where(isNull(rateItems.archivedAt))
    .orderBy(asc(rateItems.category), asc(rateItems.pod), asc(rateItems.name));
  const all = rows.map((it) => ({ value: it.id, label: itemLabel(it), category: it.category }));
  return { lanes: all.filter((x) => x.category === "ocean"), items: all };
}
