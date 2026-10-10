import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { type App, MIN_VISIT_SECONDS, timeTable } from "@/domain/visits";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import {
  bookings,
  contacts,
  invoices,
  quotations,
  timeLog,
  users,
  visits,
} from "@/server/db/schema";

type Window = { from: string | null; to: string };

const inWindow = (day: typeof timeLog.day | typeof visits.day, w: Window) =>
  and(w.from ? gte(day, w.from) : undefined, lte(day, w.to));

/** Every active person against every app over the window (legacy Settings › Time). */
export async function timeByApp(w: Window) {
  await requirePermission("audit.view");
  const [people, cells] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.active, true))
      .orderBy(asc(users.name)),
    db
      .select({
        userId: timeLog.userId,
        app: timeLog.app,
        seconds: sql<number>`sum(${timeLog.seconds})::int`,
      })
      .from(timeLog)
      .where(inWindow(timeLog.day, w))
      .groupBy(timeLog.userId, timeLog.app),
  ]);
  return timeTable(people, cells);
}

export type Visit = { kind: string; label: string; href: string; seconds: number; day: string };

/** One person's time by app and their visits over the window (legacy visitsOf, userSummary.byApp). */
export async function personTime(userId: string, w: Window) {
  await requirePermission("audit.view");
  const [byApp, seen] = await Promise.all([
    db
      .select({ app: timeLog.app, seconds: sql<number>`sum(${timeLog.seconds})::int` })
      .from(timeLog)
      .where(and(eq(timeLog.userId, userId), inWindow(timeLog.day, w)))
      .groupBy(timeLog.app),
    db
      .select({
        kind: visits.kind,
        recordId: visits.recordId,
        day: visits.day,
        seconds: visits.seconds,
        booking: bookings.ref,
        quotation: quotations.ref,
        contact: contacts.name,
        invoice: invoices.number,
      })
      .from(visits)
      .leftJoin(bookings, and(eq(visits.kind, "booking"), eq(bookings.id, visits.recordId)))
      .leftJoin(quotations, and(eq(visits.kind, "quotation"), eq(quotations.id, visits.recordId)))
      .leftJoin(contacts, and(eq(visits.kind, "contact"), eq(contacts.id, visits.recordId)))
      .leftJoin(invoices, and(eq(visits.kind, "invoice"), eq(invoices.id, visits.recordId)))
      // A glance is not a visit (legacy): only stretches of a few seconds or more.
      .where(
        and(
          eq(visits.userId, userId),
          gte(visits.seconds, MIN_VISIT_SECONDS),
          inWindow(visits.day, w),
        ),
      )
      .orderBy(desc(visits.day), desc(visits.seconds))
      .limit(50),
  ]);
  const HREF: Record<string, string> = {
    booking: "/bookings/",
    quotation: "/quotations/",
    contact: "/contacts/",
    invoice: "/accounting/invoices/",
  };
  return {
    byApp: byApp as { app: App | string; seconds: number }[],
    total: byApp.reduce((s, r) => s + r.seconds, 0),
    visits: seen.map((v): Visit => ({
      kind: v.kind,
      label: v.booking ?? v.quotation ?? v.contact ?? v.invoice ?? "(gone)",
      href: `${HREF[v.kind] ?? "/"}${v.recordId}`,
      seconds: v.seconds,
      day: v.day,
    })),
  };
}
