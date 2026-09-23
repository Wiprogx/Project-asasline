"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { coverProblem } from "@/domain/cover";
import { ROLES } from "@/domain/permissions";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { activities, covers, users } from "@/server/db/schema";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A date");

const coverSchema = z.object({
  absentId: z.uuid("Who is away"),
  coverId: z.uuid("Who covers"),
  from: day,
  to: day.optional().or(z.literal("").transform(() => undefined)),
});

const refresh = () => {
  revalidatePath("/activity", "layout");
  revalidatePath("/");
};

/** Somebody is away: a colleague covers their tasks for those days. Nothing is moved. */
export async function addCover(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("activity.cover");
  const parsed = coverSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { absentId, coverId, from } = parsed.data;
  const to = parsed.data.to ?? null;
  const people = await db
    .select({ id: users.id, name: users.name, active: users.active })
    .from(users)
    .where(inArray(users.id, [absentId, coverId]));
  const name = (id: string) => people.find((p) => p.id === id)?.name ?? "?";
  if (!people.find((p) => p.id === coverId)?.active)
    return fail("The person covering must be able to sign in.");
  const live = await db
    .select()
    .from(covers)
    .where(and(isNull(covers.endedAt), isNull(covers.archivedAt)));
  const problem = coverProblem(
    { absentId, coverId, from, to },
    live.map((c) => ({ ...c, ended: false })),
    { absent: name(absentId), cover: name(coverId) },
  );
  if (problem) return fail(problem);
  const [row] = await db
    .insert(covers)
    .values({ absentId, coverId, fromDate: from, toDate: to, createdBy: user.id })
    .returning({ id: covers.id });
  await audit(db, {
    action: "cover.add",
    userId: user.id,
    entity: "cover",
    entityId: row.id,
    detail: { absent: name(absentId), cover: name(coverId), from, to },
  });
  refresh();
  return { ok: true, data: undefined, message: `${name(coverId)} covers for ${name(absentId)}` };
}

/** Back early (or the absence called off): the tasks are theirs again at once. */
export async function endCover(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("activity.cover");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Which cover?");
  const [c] = await db
    .update(covers)
    .set({ endedAt: new Date(), updatedBy: user.id, updatedAt: new Date() })
    .where(and(eq(covers.id, id.data), isNull(covers.endedAt)))
    .returning({ id: covers.id });
  if (!c) return fail("This cover has already ended.");
  await audit(db, { action: "cover.end", userId: user.id, entity: "cover", entityId: id.data });
  refresh();
  return { ok: true, data: undefined, message: "Back — the tasks are theirs again" };
}

const handOverSchema = z.object({
  from: z.string().min(1, "From whom"),
  toId: z.uuid("To whom"),
});

/**
 * Leaving for good (or a job change): every open task of a person — or of a role nobody
 * holds any more — moves to someone, once, and the log says how many.
 */
export async function handOver(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("activity.cover");
  const parsed = handOverSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { from, toId } = parsed.data;
  const isRole = (ROLES as readonly string[]).includes(from);
  if (!isRole && !z.uuid().safeParse(from).success) return fail("From whom?");
  if (from === toId) return fail("Somebody else has to take them.");
  const [to] = await db
    .select({ name: users.name, active: users.active })
    .from(users)
    .where(eq(users.id, toId));
  if (!to?.active) return fail("The person taking over must be able to sign in.");
  const moved = await db.transaction(async (tx) => {
    const rows = await tx
      .update(activities)
      // Each task moves a version on, so an edit made against the old owner is a conflict.
      .set({
        assigneeId: toId,
        version: sql`${activities.version} + 1`,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(activities.state, "open"),
          isRole
            ? and(
                isNull(activities.assigneeId),
                eq(activities.role, from as (typeof ROLES)[number]),
              )
            : eq(activities.assigneeId, from),
        ),
      )
      .returning({ id: activities.id });
    await audit(tx, {
      action: "tasks.handover",
      userId: user.id,
      entity: "activity",
      entityId: from,
      detail: { to: toId, count: rows.length, on: officeToday() },
    });
    return rows.length;
  });
  refresh();
  return {
    ok: true,
    data: undefined,
    message: `${moved} open task${moved === 1 ? "" : "s"} handed over to ${to.name}`,
  };
}
