import "server-only";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import type { QuotationStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { contacts, quotationLines, quotationRoutes, quotations } from "@/server/db/schema";

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
        with: { lines: { orderBy: asc(quotationLines.position) } },
      },
    },
  });
}
