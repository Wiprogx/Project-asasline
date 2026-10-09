import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { addDays } from "@/domain/dates";
import { kpiHead, marginBy } from "@/domain/kpis";
import type { Period } from "@/domain/period";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, invoices, vessels } from "@/server/db/schema";
import { openInvoices } from "./money";

const signed = sql<number>`coalesce(sum(case ${invoices.kind}
  when 'invoice' then ${invoices.netCents} when 'credit' then -${invoices.netCents} else 0 end), 0)::int`;

/** The office's figures for a period (legacy kpis): the head, and the margin by customer, destination and line. */
export async function kpis(period: Period, today: string) {
  await requirePermission("app.accounting");
  const sales = and(
    eq(invoices.status, "issued"),
    eq(invoices.opening, false),
    inArray(invoices.kind, ["invoice", "credit"]),
  );
  const [[inPeriod], [last90], open, ships] = await Promise.all([
    db
      .select({ net: signed })
      .from(invoices)
      .where(and(sales, sql`${invoices.issueDate} between ${period.from} and ${period.to}`)),
    db
      .select({
        gross: sql<number>`coalesce(sum(case ${invoices.kind}
          when 'invoice' then ${invoices.grossCents} when 'credit' then -${invoices.grossCents} else 0 end), 0)::int`,
      })
      .from(invoices)
      .where(and(sales, sql`${invoices.issueDate} >= ${addDays(today, -90)}`)),
    openInvoices(db),
    db
      .select({
        customer: contacts.name,
        pod: bookings.pod,
        carrier: vessels.carrier,
        revenueCents: signed,
        costCents: sql<number>`coalesce(sum(case when ${invoices.kind} = 'bill' then ${invoices.netCents} else 0 end), 0)::int`,
      })
      .from(invoices)
      .innerJoin(bookings, eq(bookings.id, invoices.bookingId))
      .leftJoin(contacts, eq(contacts.id, bookings.clientId))
      .leftJoin(vessels, eq(vessels.id, bookings.vesselId))
      .where(
        and(
          eq(invoices.status, "issued"),
          inArray(invoices.kind, ["invoice", "credit", "bill"]),
          sql`${invoices.issueDate} between ${period.from} and ${period.to}`,
        ),
      )
      .groupBy(bookings.id, contacts.name, bookings.pod, vessels.carrier),
  ]);
  const openArCents = open.filter((i) => i.kind !== "bill").reduce((s, i) => s + i.openCents, 0);
  return {
    head: kpiHead({ revenueCents: inPeriod.net, openArCents, grossLast90Cents: last90.gross }),
    byCustomer: marginBy(ships, (i) => ships[i].customer),
    byDestination: marginBy(ships, (i) => ships[i].pod),
    byCarrier: marginBy(ships, (i) => ships[i].carrier),
  };
}
