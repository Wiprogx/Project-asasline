import "server-only";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { openCents } from "@/domain/payments";
import type { DbOrTx } from "@/server/db/client";
import { bookings, invoiceLines, invoices, quotationLines } from "@/server/db/schema";
import { creditedSql, settledSql } from "./money";

// Internal: read by the reminder screen and the contact page (permission-checked there) and by
// the issue action.

/** The last reminder written on an invoice. */
export const lastReminderSql = sql<{ level: number; sentOn: string } | null>`(
  select json_build_object('level', r.level, 'sentOn', r.sent_on) from invoice_reminders r
  where r.invoice_id = "invoices"."id" and r.archived_at is null
  order by r.sent_on desc, r.level desc limit 1)`;

/**
 * What a customer could owe at one time (legacy exposure): the open part of their issued
 * invoices, plus what their live bookings will still invoice from the quotation.
 */
export async function exposureOf(db: DbOrTx, customerId: string): Promise<number> {
  const open = await db
    .select({ gross: invoices.grossCents, settled: settledSql, credited: creditedSql })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customerId),
        eq(invoices.kind, "invoice"),
        eq(invoices.status, "issued"),
      ),
    );
  const live = await db
    .select({ id: bookings.id, routeId: bookings.quotationRouteId })
    .from(bookings)
    .where(
      and(
        eq(bookings.clientId, customerId),
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
      ),
    );
  let toBill = 0;
  const quoted = live.filter((b) => b.routeId);
  if (quoted.length) {
    const [sold] = await db
      .select({
        cents: sql<number>`coalesce(sum(${quotationLines.qty} * ${quotationLines.sellCents}), 0)::int`,
      })
      .from(quotationLines)
      .where(
        and(
          inArray(
            quotationLines.routeId,
            quoted.map((b) => b.routeId!),
          ),
          isNull(quotationLines.archivedAt),
        ),
      );
    const [billed] = await db
      .select({
        cents: sql<number>`coalesce(sum(case ${invoices.kind} when 'credit' then -1 else 1 end * ${invoiceLines.qty} * ${invoiceLines.unitCents}), 0)::int`,
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(
        and(
          inArray(
            invoices.bookingId,
            quoted.map((b) => b.id),
          ),
          eq(invoices.status, "issued"),
          ne(invoices.kind, "bill"),
          isNull(invoiceLines.archivedAt),
          sql`${invoiceLines.sourceKey} like 'q:%'`,
        ),
      );
    toBill = Math.max(0, sold.cents - billed.cents);
  }
  const owed = open.reduce((s, r) => s + openCents(r.gross ?? 0, r.settled, r.credited), 0);
  return owed + toBill;
}
