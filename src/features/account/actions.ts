"use server";

import { eq } from "drizzle-orm";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/dal";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { revokeOtherSessions } from "@/server/auth/session";
import { hit, peek, reset } from "@/server/cache/rate-limit";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { changePasswordSchema } from "./schemas";

const WINDOW = 15 * 60;
const MAX_TRIES = 6;

/**
 * Needs the current password (a session left open on a shared desk is not enough), is rate
 * limited like the login, and signs every other device out once it succeeds.
 */
export async function changePassword(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const key = `pw:${user.id}`;
  if ((await peek(key)) >= MAX_TRIES) return fail("Too many attempts. Wait 15 minutes.");

  const [row] = await db
    .select({ hash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id));
  if (!row || !(await verifyPassword(parsed.data.current, row.hash))) {
    await hit(key, WINDOW);
    await audit(db, { action: "password.failed", userId: user.id });
    return {
      ok: false,
      error: "Your current password is not right.",
      fieldErrors: { current: ["Not right"] },
    };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next) })
    .where(eq(users.id, user.id));
  await revokeOtherSessions(user.id);
  await reset(key);
  await audit(db, {
    action: "password.change",
    userId: user.id,
    entity: "user",
    entityId: user.id,
  });
  return { ok: true, data: undefined, message: "Password changed — other devices were signed out" };
}
