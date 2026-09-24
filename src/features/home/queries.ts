import "server-only";
import { and, count, eq, gte, inArray, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import { monthRange } from "@/domain/dates";
import { can } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";
import { cached, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import {
  activities,
  bookings,
  contactAddresses,
  contacts,
  containers,
  invoices,
  messages,
  quotationLines,
  quotations,
} from "@/server/db/schema";

const n = (v: unknown) => Number(v ?? 0);

/** The app launcher's counts (legacy vHome): what each app holds, for the apps the role opens. */
export async function appTiles(today: string) {
  const user = await requireUser();
  const role = user.role;
  const one = async <T>(allowed: boolean, q: () => Promise<T>) => (allowed ? q() : null);
  const [tasks, quotes, books, people, mail, bills] = await Promise.all([
    one(can(role, "app.activity"), async () => {
      const [r] = await db
        .select({
          overdue: sql<number>`count(*) filter (where ${activities.due} < ${today})::int`,
          today: sql<number>`count(*) filter (where ${activities.due} = ${today})::int`,
          upcoming: sql<number>`count(*) filter (where ${activities.due} > ${today} or ${activities.due} is null)::int`,
        })
        .from(activities)
        .where(eq(activities.state, "open"));
      return r;
    }),
    one(can(role, "app.quotations"), async () => {
      const [r] = await db
        .select({
          total: count(),
          open: sql<number>`count(*) filter (where ${quotations.status} in ('draft', 'sent'))::int`,
        })
        .from(quotations)
        .where(ne(quotations.status, "cancelled"));
      return r;
    }),
    one(can(role, "app.bookings"), async () => {
      const [r] = await db
        .select({ total: count() })
        .from(bookings)
        .where(and(ne(bookings.status, "cancelled"), isNull(bookings.archivedAt)));
      return r;
    }),
    one(can(role, "app.contacts"), async () => {
      const [c] = await db
        .select({ total: count() })
        .from(contacts)
        .where(isNull(contacts.archivedAt));
      const [a] = await db
        .select({ total: count() })
        .from(contactAddresses)
        .where(isNull(contactAddresses.archivedAt));
      return { total: c.total, addresses: a.total };
    }),
    one(can(role, "app.discuss"), async () => {
      const [r] = await db.select({ total: count() }).from(messages);
      return r;
    }),
    one(can(role, "app.accounting"), async () => {
      const [r] = await db
        .select({ total: count() })
        .from(invoices)
        .where(eq(invoices.status, "issued"));
      return r;
    }),
  ]);
  return { tasks, quotes, books, people, mail, bills };
}

export type MonthStats = {
  label: string;
  bookings: number;
  containers: number;
  destinations: number;
  inTransit: number;
  arrived: number;
  valueCents: number;
  overdueSteps: number;
};

async function statsBetween(
  from: string,
  to: string,
  today: string,
  label: string,
): Promise<MonthStats> {
  // Counted by sailing date, else loading date: that is what a month of work means here.
  const day = sql`coalesce(${bookings.etd}, ${bookings.loadDate})`;
  const live = await db
    .select({
      id: bookings.id,
      pod: bookings.pod,
      status: bookings.status,
      routeId: bookings.quotationRouteId,
    })
    .from(bookings)
    .where(
      and(
        ne(bookings.status, "cancelled"),
        isNull(bookings.archivedAt),
        gte(day, from),
        lte(day, to),
      ),
    );
  const ids = live.map((b) => b.id);
  const routeIds = live.flatMap((b) => (b.routeId ? [b.routeId] : []));
  const empty = {
    label,
    bookings: 0,
    containers: 0,
    destinations: 0,
    inTransit: 0,
    arrived: 0,
    valueCents: 0,
    overdueSteps: 0,
  };
  if (ids.length === 0) return empty;
  const [[boxes], [value], [late]] = await Promise.all([
    db
      .select({ total: count() })
      .from(containers)
      .where(and(inArray(containers.bookingId, ids), isNull(containers.archivedAt))),
    routeIds.length
      ? db
          .select({
            cents: sql<number>`coalesce(sum(${quotationLines.qty} * ${quotationLines.sellCents}), 0)::int`,
          })
          .from(quotationLines)
          .where(and(inArray(quotationLines.routeId, routeIds), isNull(quotationLines.archivedAt)))
      : Promise.resolve([{ cents: 0 }]),
    db
      .select({ total: count() })
      .from(activities)
      .where(
        and(
          eq(activities.linkKind, "booking"),
          inArray(activities.linkId, ids),
          eq(activities.state, "open"),
          isNotNull(activities.ruleCode),
          sql`${activities.due} < ${today}`,
        ),
      ),
  ]);
  return {
    ...empty,
    bookings: live.length,
    containers: n(boxes.total),
    destinations: new Set(live.map((b) => b.pod).filter(Boolean)).size,
    inTransit: live.filter((b) => b.status === "in_transit").length,
    arrived: live.filter((b) => b.status === "arrived").length,
    valueCents: n(value.cents),
    overdueSteps: n(late.total),
  };
}

/** The operational month (legacy bStatsPanel): this month against the last, by sailing date. */
export async function monthPanel(today: string) {
  const user = await requireUser();
  if (!can(user.role, "app.bookings")) return null;
  // The figures are the office's (one cache for everyone); what the role may see is decided here.
  const months = await cached(
    `home:month:${today}`,
    { ttlSeconds: 60, tags: [tags.bookings, tags.dashboard] },
    async () => {
      const cur = monthRange(today);
      const prev = monthRange(today, 1);
      const [now, before] = await Promise.all([
        statsBetween(cur.from, cur.to, today, cur.label),
        statsBetween(prev.from, prev.to, today, prev.label),
      ]);
      return { now, before };
    },
  );
  return { ...months, showValue: can(user.role, "costs.view") };
}
