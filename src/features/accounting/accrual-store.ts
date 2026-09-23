import "server-only";
import { and, eq, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { accrualLines } from "@/domain/accruals";
import type { DbOrTx } from "@/server/db/client";
import { bookings, contacts, invoices, quotationLines, quotationRoutes } from "@/server/db/schema";

// Internal: read by the accruals screen (permission-checked) and the booking action.

/** Shipments sailed by the day whose expected cost is not yet all invoiced by suppliers. */
export async function accrualCandidates(db: DbOrTx, upTo: string) {
  const sailed = await db
    .select({
      id: bookings.id,
      ref: bookings.ref,
      quotationId: bookings.quotationId,
      etd: bookings.etd,
      client: contacts.name,
    })
    .from(bookings)
    .leftJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(
      and(
        isNotNull(bookings.etd),
        lte(bookings.etd, upTo),
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
        isNotNull(bookings.quotationId),
      ),
    );
  if (sailed.length === 0) return [];
  const [expected, billed] = await Promise.all([
    db
      .select({
        quotationId: quotationRoutes.quotationId,
        cents: sql<number>`coalesce(sum(${quotationLines.qty} * ${quotationLines.costCents}), 0)::int`,
      })
      .from(quotationLines)
      .innerJoin(quotationRoutes, eq(quotationRoutes.id, quotationLines.routeId))
      .where(
        and(
          inArray(
            quotationRoutes.quotationId,
            sailed.map((b) => b.quotationId!),
          ),
          eq(quotationRoutes.declined, false),
          isNull(quotationLines.archivedAt),
        ),
      )
      .groupBy(quotationRoutes.quotationId),
    db
      .select({
        bookingId: invoices.bookingId,
        cents: sql<number>`coalesce(sum(${invoices.netCents}), 0)::int`,
      })
      .from(invoices)
      .where(
        and(
          inArray(
            invoices.bookingId,
            sailed.map((b) => b.id),
          ),
          eq(invoices.kind, "bill"),
          eq(invoices.status, "issued"),
        ),
      )
      .groupBy(invoices.bookingId),
  ]);
  const lines = accrualLines(
    sailed.map((b) => ({
      bookingId: b.id,
      ref: b.ref,
      expectedCents: expected.find((e) => e.quotationId === b.quotationId)?.cents ?? 0,
      billedCents: billed.find((x) => x.bookingId === b.id)?.cents ?? 0,
    })),
  );
  return lines.map((l) => {
    const b = sailed.find((s) => s.id === l.bookingId)!;
    return { ...l, etd: b.etd, client: b.client };
  });
}
