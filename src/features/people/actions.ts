"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { staffChangeRefusal } from "@/domain/people";
import type { Role } from "@/domain/permissions";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { hashPassword } from "@/server/auth/password";
import { revokeAllSessionsOf } from "@/server/auth/session";
import { db, type Tx } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { activeChangeSchema, newPersonSchema, roleChangeSchema } from "./schemas";

class Refused extends Error {}

/**
 * Loads the person and the active-Admin count under a row lock, so two Admins demoting each
 * other at the same moment cannot leave the office with none.
 */
async function guard(
  tx: Tx,
  actorId: string,
  id: string,
  change: { role?: Role; active?: boolean },
) {
  await tx.execute(sql`select 1 from ${users} where ${users.role} = 'admin' for update`);
  const [target] = await tx.select().from(users).where(eq(users.id, id));
  if (!target) throw new Refused("That person no longer exists.");
  const [{ n }] = await tx
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)));
  const refusal = staffChangeRefusal(actorId, target, change, n);
  if (refusal) throw new Refused(refusal);
  return target;
}

async function run(fn: () => Promise<void>, message: string): Promise<ActionResult> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof Refused) return fail(e.message);
    throw e;
  }
  revalidatePath("/settings/people");
  return { ok: true, data: undefined, message };
}

export async function addPerson(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requirePermission("app.settings");
  const parsed = newPersonSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { password, ...person } = parsed.data;
  const passwordHash = await hashPassword(password);
  return run(async () => {
    const rows = await db
      .insert(users)
      .values({ ...person, passwordHash })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (rows.length === 0) throw new Refused("Someone already uses that email.");
    await audit(db, {
      action: "user.add",
      userId: actor.id,
      entity: "user",
      entityId: rows[0].id,
      detail: { email: person.email, role: person.role },
    });
  }, `${person.name} can now sign in`);
}

export async function changeRole(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requirePermission("app.settings");
  const parsed = roleChangeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, role } = parsed.data;
  return run(
    () =>
      db.transaction(async (tx) => {
        const before = await guard(tx, actor.id, id, { role });
        await tx.update(users).set({ role }).where(eq(users.id, id));
        await audit(tx, {
          action: "user.role",
          userId: actor.id,
          entity: "user",
          entityId: id,
          detail: { from: before.role, to: role },
        });
      }),
    "Role changed",
  );
}

/** Switched off, never deleted: their name stays on every record they touched. */
export async function setActive(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requirePermission("app.settings");
  const parsed = activeChangeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, active } = parsed.data;
  return run(
    () =>
      db.transaction(async (tx) => {
        await guard(tx, actor.id, id, { active });
        await tx.update(users).set({ active }).where(eq(users.id, id));
        if (!active) await revokeAllSessionsOf(tx, id);
        await audit(tx, {
          action: active ? "user.on" : "user.off",
          userId: actor.id,
          entity: "user",
          entityId: id,
        });
      }),
    active ? "Switched back on" : "Switched off and signed out",
  );
}
