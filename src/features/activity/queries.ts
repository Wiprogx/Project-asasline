import "server-only";
import { and, asc, eq, gte, ilike, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { TaskState } from "@/domain/tasks";
import { type CurrentUser, requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { activities, bookings, covers, users } from "@/server/db/schema";

const doneBy = alias(users, "done_by_user");

/** Tasks as every screen shows them: owner, linked booking ref, who closed them. */
function baseQuery() {
  return db
    .select({
      id: activities.id,
      version: activities.version,
      title: activities.title,
      due: activities.due,
      state: activities.state,
      role: activities.role,
      note: activities.note,
      withdrawReason: activities.withdrawReason,
      blocking: activities.blocking,
      assigneeId: activities.assigneeId,
      assigneeName: users.name,
      linkKind: activities.linkKind,
      linkId: activities.linkId,
      linkRef: bookings.ref,
      doneAt: activities.doneAt,
      doneByName: doneBy.name,
    })
    .from(activities)
    .leftJoin(users, eq(users.id, activities.assigneeId))
    .leftJoin(doneBy, eq(doneBy.id, activities.doneBy))
    .leftJoin(
      bookings,
      and(eq(activities.linkKind, "booking"), eq(bookings.id, activities.linkId)),
    );
}

export type TaskRow = Awaited<ReturnType<ReturnType<typeof baseQuery>["execute"]>>[number];

/**
 * Mine = assigned to me, or to my role and not yet taken (domain `isMine`, in SQL) — and,
 * while I cover for somebody away, their tasks too (domain `coveredBy`).
 */
const mineWhere = (me: CurrentUser) => {
  const today = officeToday();
  return or(
    eq(activities.assigneeId, me.id),
    and(isNull(activities.assigneeId), eq(activities.role, me.role)),
    sql`${activities.assigneeId} in (select c.absent_id from covers c
      where c.cover_id = ${me.id} and c.ended_at is null and c.archived_at is null
      and c.from_date <= ${today} and (c.to_date is null or c.to_date >= ${today}))`,
  )!;
};

function whoWhere(who: string, me: CurrentUser): SQL | undefined {
  if (who === "mine") return mineWhere(me);
  if (z.uuid().safeParse(who).success) return eq(activities.assigneeId, who);
  return undefined;
}

const byDue = [sql`${activities.due} asc nulls last`, asc(activities.createdAt)];

export async function listTasks(opts: { who: string; state: TaskState; q?: string }) {
  const me = await requirePermission("app.activity");
  const where: (SQL | undefined)[] = [eq(activities.state, opts.state), whoWhere(opts.who, me)];
  if (opts.q) {
    const like = `%${opts.q}%`;
    where.push(or(ilike(activities.title, like), ilike(bookings.ref, like)));
  }
  return baseQuery()
    .where(and(...where))
    .orderBy(...byDue)
    .limit(500);
}

/** Open tasks due inside [from, to], for the month calendar. */
export async function tasksBetween(from: string, to: string, who: string) {
  const me = await requirePermission("app.activity");
  return baseQuery()
    .where(
      and(
        eq(activities.state, "open"),
        gte(activities.due, from),
        lte(activities.due, to),
        whoWhere(who, me),
      ),
    )
    .orderBy(...byDue);
}

/** Every task of one booking, whatever its state (the booking's Tasks tab). */
export async function tasksForBooking(bookingId: string) {
  await requirePermission("app.activity");
  if (!z.uuid().safeParse(bookingId).success) return [];
  return baseQuery()
    .where(and(eq(activities.linkKind, "booking"), eq(activities.linkId, bookingId)))
    .orderBy(...byDue);
}

/** Active staff, for "assign to" and the person filter. */
export async function staffOptions() {
  await requirePermission("app.activity");
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));
}

/** The home screen's two numbers: my open tasks overdue, and due today. */
export async function myTaskCounts(today: string) {
  const me = await requirePermission("app.activity");
  const [row] = await db
    .select({
      overdue: sql<number>`count(*) filter (where ${activities.due} < ${today})::int`,
      today: sql<number>`count(*) filter (where ${activities.due} = ${today})::int`,
    })
    .from(activities)
    .where(and(eq(activities.state, "open"), mineWhere(me)));
  return row;
}

const absent = alias(users, "absent_user");
const coverer = alias(users, "cover_user");

/** Covers running or to come, with how many open tasks each absent person holds. */
export async function coversNow() {
  await requirePermission("app.activity");
  const today = officeToday();
  return db
    .select({
      id: covers.id,
      absentId: covers.absentId,
      absent: absent.name,
      cover: coverer.name,
      fromDate: covers.fromDate,
      toDate: covers.toDate,
      open: sql<number>`(select count(*) from activities a where a.assignee_id = ${covers.absentId} and a.state = 'open')::int`,
    })
    .from(covers)
    .innerJoin(absent, eq(absent.id, covers.absentId))
    .innerJoin(coverer, eq(coverer.id, covers.coverId))
    .where(
      and(
        isNull(covers.endedAt),
        isNull(covers.archivedAt),
        or(isNull(covers.toDate), gte(covers.toDate, today)),
      ),
    )
    .orderBy(asc(covers.fromDate));
}
