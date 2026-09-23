"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nextState, type TaskMove } from "@/domain/tasks";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { type CurrentUser, requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { activities, bookings } from "@/server/db/schema";
import { ConflictError, updateVersioned } from "@/server/versioned";
import { handOverSchema, newTaskSchema, taskRef, withdrawTaskSchema } from "./schemas";

class Refused extends Error {}

function refresh(linkKind: string | null, linkId: string | null) {
  revalidatePath("/activity", "layout");
  revalidatePath("/");
  if (linkKind === "booking" && linkId) revalidatePath(`/bookings/${linkId}`, "layout");
}

async function run(
  fn: () => Promise<{ linkKind: string | null; linkId: string | null }>,
  message: string,
): Promise<ActionResult> {
  try {
    const link = await fn();
    refresh(link.linkKind, link.linkId);
    return { ok: true, data: undefined, message };
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message);
    throw e;
  }
}

export async function createTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = newTaskSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  if (!!d.linkKind !== !!d.linkId) return fail("A link needs both its kind and its record.");

  return run(async () => {
    return db.transaction(async (tx) => {
      if (d.linkKind === "booking") {
        const [b] = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(eq(bookings.id, d.linkId!));
        if (!b) throw new Refused("That booking no longer exists.");
      }
      const [row] = await tx
        .insert(activities)
        .values({ ...d, createdBy: user.id, updatedBy: user.id })
        .returning({ id: activities.id });
      await audit(tx, {
        action: "task.create",
        userId: user.id,
        entity: "activity",
        entityId: row.id,
        detail: { title: d.title },
      });
      return { linkKind: d.linkKind ?? null, linkId: d.linkId ?? null };
    });
  }, "Task added");
}

/** One path for the four state moves, so every move checks the state it starts from. */
async function move(
  user: CurrentUser,
  id: string,
  version: number,
  m: TaskMove,
  extra: Record<string, unknown>,
  detail?: Record<string, unknown>,
) {
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(activities).where(eq(activities.id, id));
    if (!cur) throw new ConflictError("This task");
    const to = nextState(cur.state, m);
    if (!to) throw new Refused(`This task is ${cur.state}; reload to see its current state.`);
    await updateVersioned(
      tx,
      activities,
      id,
      version,
      { state: to, ...extra, updatedBy: user.id },
      "This task",
    );
    await audit(tx, {
      action: `task.${m}`,
      userId: user.id,
      entity: "activity",
      entityId: id,
      detail,
    });
    return { linkKind: cur.linkKind, linkId: cur.linkId };
  });
}

export async function completeTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = taskRef.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  return run(
    () =>
      move(user, parsed.data.id, parsed.data.version, "complete", {
        doneAt: new Date(),
        doneBy: user.id,
      }),
    "Done",
  );
}

export async function reopenTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = taskRef.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  return run(
    () => move(user, parsed.data.id, parsed.data.version, "reopen", { doneAt: null, doneBy: null }),
    "Reopened",
  );
}

/** Withdrawn, never deleted: the reason stays on the task and it can be put back. */
export async function withdrawTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = withdrawTaskSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  return run(
    () => move(user, id, version, "withdraw", { withdrawReason: reason }, { reason }),
    "Withdrawn",
  );
}

export async function putBackTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = taskRef.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  return run(
    () => move(user, parsed.data.id, parsed.data.version, "putBack", { withdrawReason: null }),
    "Put back",
  );
}

/** Hand over to a person, or back to a role; only an open task changes hands. */
export async function handOverTask(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("app.activity");
  const parsed = handOverSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, assigneeId, role } = parsed.data;
  return run(async () => {
    return db.transaction(async (tx) => {
      const [cur] = await tx.select().from(activities).where(eq(activities.id, id));
      if (!cur) throw new ConflictError("This task");
      if (cur.state !== "open") throw new Refused("Only an open task can be handed over.");
      await updateVersioned(
        tx,
        activities,
        id,
        version,
        { assigneeId: assigneeId ?? null, role: role ?? cur.role, updatedBy: user.id },
        "This task",
      );
      await audit(tx, {
        action: "task.handover",
        userId: user.id,
        entity: "activity",
        entityId: id,
        detail: { to: assigneeId ?? role },
      });
      return { linkKind: cur.linkKind, linkId: cur.linkId };
    });
  }, "Handed over");
}
