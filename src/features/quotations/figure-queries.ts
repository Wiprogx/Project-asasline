import "server-only";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Ranked } from "@/domain/quotation-list";
import type { QuotationStatus } from "@/domain/shipments";
import { requirePermission } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { officeZone } from "@/server/clock";
import { db } from "@/server/db/client";
import { portCodeOf } from "@/server/port-sql";
import { contacts, quotationRoutes, quotations } from "@/server/db/schema";

export type ListScope = {
  q?: string;
  status?: QuotationStatus;
  /** The day the quotation was made, in the office's zone (legacy qDate on createdAt). */
  period?: { from: string; to: string } | null;
};

/** The day a quotation was made, as the office counts days (invariant 4). */
export const createdOn = sql<string>`(${quotations.createdAt} at time zone ${officeZone()})::date`;

/** The list's filters as SQL, shared by the rows and the rankings so the two never disagree. */
export function scopeWhere(s: ListScope) {
  const q = s.q?.trim() ?? "";
  const like = `%${q}%`;
  return and(
    s.status ? eq(quotations.status, s.status) : undefined,
    q ? or(ilike(quotations.ref, like), ilike(contacts.name, like)) : undefined,
    s.period
      ? sql`${createdOn} between ${s.period.from}::date and ${s.period.to}::date`
      : undefined,
  );
}

const scopeKey = (s: ListScope) =>
  `${s.status ?? "*"}:${(s.q ?? "").trim().toLowerCase()}:${s.period ? `${s.period.from}_${s.period.to}` : "*"}`;

/** The port-to-port lanes asked for most (legacy topLanes), over the list as it is filtered. */
export async function topLanes(s: ListScope, n = 5): Promise<Ranked[]> {
  await requirePermission("app.quotations");
  return cached(
    `quotations:lanes:${scopeKey(s)}`,
    { ttlSeconds: 30, tags: [tags.quotations] },
    async () => {
      const rows = await db
        .select({
          pol: portCodeOf(quotationRoutes.polId),
          pod: portCodeOf(quotationRoutes.podId),
          n: sql<number>`count(*)::int`,
        })
        .from(quotationRoutes)
        .innerJoin(quotations, eq(quotations.id, quotationRoutes.quotationId))
        .innerJoin(contacts, eq(contacts.id, quotations.clientId))
        .where(
          and(
            isNull(quotationRoutes.archivedAt),
            sql`${quotations.status} <> 'cancelled'`,
            scopeWhere(s),
          ),
        )
        .groupBy(quotationRoutes.polId, quotationRoutes.podId)
        .orderBy(desc(sql`count(*)`))
        .limit(n);
      return rows.map((r) => ({ label: `${r.pol} → ${r.pod}`, n: r.n, valueCents: 0 }));
    },
  );
}
