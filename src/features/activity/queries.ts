import "server-only";
import { and, asc, eq, gte, ilike, isNull, lte, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { TaskState } from "@/domain/tasks";
import { type CurrentUser, requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { activities, bookings, users } from "@/server/db/schema";

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

/** Mine = assigned to me, or to my role and not yet taken (domain `isMine`, in SQL). */
const mineWhere = (me: CurrentUser) =>
  or(
    eq(activities.assigneeId, me.id),
    and(isNull(activities.assigneeId), eq(activities.role, me.role)),
  )!;

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
