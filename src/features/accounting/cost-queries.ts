import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { type CostLine, costSummary } from "@/domain/cost";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import {
  bookings,
  contacts,
  invoices,
  quotationLines,
  quotationRoutes,
  quotations,
} from "@/server/db/schema";

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/**
 * The cost and margin of a booking (legacy Cost & margin tab, `costs.view`): the expected cost
 * from the quotation's destination, the supplier bills recorded against the booking, and the
 * profit either way. Opening it is audited: cost and margin are the figures the legacy
 * ACCESS_WATCH kept an eye on.
 */
export async function bookingCost(bookingId: string) {
  const user = await requirePermission("costs.view");
  if (!isUuid(bookingId)) return null;
  const [b] = await db
    .select({
      id: bookings.id,
      ref: bookings.ref,
      status: bookings.status,
      quotationRouteId: bookings.quotationRouteId,
      quotationRef: quotations.ref,
      quotationId: quotations.id,
    })
    .from(bookings)
    .leftJoin(quotations, eq(quotations.id, bookings.quotationId))
    .where(eq(bookings.id, bookingId));
  if (!b) return null;

  const [lines, bills] = await Promise.all([
    b.quotationRouteId
      ? db
          .select({
            description: quotationLines.description,
            qty: quotationLines.qty,
            sellCents: quotationLines.sellCents,
            costCents: quotationLines.costCents,
            perBox: quotationLines.perBox,
            condition: quotationLines.condition,
            boxes: quotationRoutes.boxes,
          })
          .from(quotationLines)
          .innerJoin(quotationRoutes, eq(quotationRoutes.id, quotationLines.routeId))
          .where(
            and(eq(quotationLines.routeId, b.quotationRouteId), isNull(quotationLines.archivedAt)),
          )
          .orderBy(asc(quotationLines.position), asc(quotationLines.createdAt))
      : Promise.resolve([]),
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        supplierRef: invoices.supplierRef,
        supplier: contacts.name,
        netCents: invoices.netCents,
        issueDate: invoices.issueDate,
      })
      .from(invoices)
      .innerJoin(contacts, eq(contacts.id, invoices.customerId))
      .where(
        and(
          eq(invoices.bookingId, bookingId),
          eq(invoices.kind, "bill"),
          eq(invoices.status, "issued"),
        ),
      )
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt)),
  ]);

  // A per-container line counts qty × boxes; a term (free time) is not a cost nor a revenue.
  const times = (l: { perBox: boolean; boxes: number }) => (l.perBox ? Math.max(1, l.boxes) : 1);
  const charges = lines.filter((l) => !l.condition);
  const expectedLines: CostLine[] = charges
    .filter((l) => (l.costCents ?? 0) > 0)
    .map((l) => ({
      description: l.description + (l.perBox && l.boxes > 1 ? ` · ${l.boxes} containers` : ""),
      qty: l.qty * times(l),
      costCents: l.costCents ?? 0,
    }));
  const summary = costSummary({
    quoted: !!b.quotationRouteId,
    revenueCents: charges.reduce((s, l) => s + l.qty * times(l) * (l.sellCents ?? 0), 0),
    expectedLines,
    recordedCents: bills.reduce((s, x) => s + (x.netCents ?? 0), 0),
  });
  await audit(db, {
    action: "booking.cost.view",
    userId: user.id,
    entity: "booking",
    entityId: b.id,
    detail: { profitCents: summary.profitCents },
  });
  return { booking: b, expectedLines, bills, summary };
}
