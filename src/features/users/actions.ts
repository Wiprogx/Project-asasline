"use server";

import { and, eq, sql } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { hashPassword, temporaryPassword } from "@/server/auth/password";
import { revokeAllSessionsOf } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { passwordResets, users } from "@/server/db/schema";
import { editUserSchema, newUserSchema, switchOffSchema, switchOnSchema } from "./schemas";
import { guard, Refused, settle } from "./staff";

/**
 * A new user, with a temporary password (typed, or made up and shown once): they choose
 * their own at the first sign-in.
 */
export async function addUser(
  _p: ActionResult<{ password: string } | undefined>,
  fd: FormData,
): Promise<ActionResult<{ password: string } | undefined>> {
  const actor = await requirePermission("app.settings");
  const parsed = newUserSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { password: typed, ...person } = parsed.data;
  const password = typed || temporaryPassword();
  const passwordHash = await hashPassword(password);
  return settle(async () => {
    const [row] = await db
      .insert(users)
      .values({ ...person, passwordHash, mustChangePassword: true })
      .returning({ id: users.id });
    await audit(db, {
      action: "user.add",
      userId: actor.id,
      entity: "user",
      entityId: row.id,
      detail: { email: person.email, role: person.role },
    });
    return typed ? undefined : { password };
  }, `${person.name} can now sign in`);
}

/** Name, email, role, job title, signature and language, against the version read. */
export async function updateUser(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requirePermission("app.settings");
  const parsed = editUserSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, ...fields } = parsed.data;
  return settle(
    () =>
      db.transaction(async (tx) => {
        const before = await guard(tx, actor.id, id, { role: fields.role });
        const rows = await tx
          .update(users)
          .set({ ...fields, version: sql`${users.version} + 1` })
          .where(and(eq(users.id, id), eq(users.version, version)))
          .returning({ id: users.id });
        if (!rows.length)
          throw new Refused("Someone else changed this user. Reload to see their version.");
        const changed = Object.keys(fields).filter(
          (k) => fields[k as keyof typeof fields] !== before[k as keyof typeof before],
        );
        await audit(tx, {
          action: "user.edit",
          userId: actor.id,
          entity: "user",
          entityId: id,
          detail: {
            changed,
            ...(before.role !== fields.role && { from: before.role, to: fields.role }),
          },
        });
      }),
    "Saved",
  );
}

/** Switched off with a reason, never deleted: signed out everywhere, their links stop working. */
export async function switchOff(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requirePermission("app.settings");
  const parsed = switchOffSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, reason } = parsed.data;
  return settle(
    () =>
      db.transaction(async (tx) => {
        await guard(tx, actor.id, id, { active: false });
        await tx.update(users).set({ active: false, offReason: reason }).where(eq(users.id, id));
        await revokeAllSessionsOf(tx, id);
        await tx
          .update(passwordResets)
          .set({ usedAt: new Date() })
          .where(and(eq(passwordResets.userId, id), sql`${passwordResets.usedAt} is null`));
        await audit(tx, {
          action: "user.off",
          userId: actor.id,
          entity: "user",
          entityId: id,
          detail: { reason },
        });
      }),
    "Switched off and signed out",
  );
}

export async function switchOn(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requirePermission("app.settings");
  const parsed = switchOnSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id } = parsed.data;
  return settle(
    () =>
      db.transaction(async (tx) => {
        await guard(tx, actor.id, id, { active: true });
        await tx.update(users).set({ active: true, offReason: null }).where(eq(users.id, id));
        await audit(tx, { action: "user.on", userId: actor.id, entity: "user", entityId: id });
      }),
    "Switched back on",
  );
}
