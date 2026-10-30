"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/dal";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createResetToken, resetLink, useResetToken } from "@/server/auth/reset-tokens";
import { revokeAllSessionsOf, revokeOtherSessions } from "@/server/auth/session";
import { hit, peek } from "@/server/cache/rate-limit";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { sendSystemMail } from "@/server/delivery";
import { resetMail } from "@/domain/password-reset";
import { forgotSchema, ownPasswordSchema, resetSchema } from "./schemas";

const WINDOW = 15 * 60;
// The same answer whether the email is known, unknown or switched off: nothing leaks.
const SENT = "If that email belongs to an account, a link to choose a new password is on its way.";

/**
 * "Forgot password?" on the sign-in page: a one-time link by e-mail, rate limited by email and
 * by address. Without a mail server nothing can leave; the audit records it for an Admin.
 */
export async function requestReset(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { email } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if ((await peek(`reset:${email}`)) >= 3 || (await peek(`reset-ip:${ip}`)) >= 20)
    return fail("Too many requests. Wait 15 minutes and try again.");
  await Promise.all([hit(`reset:${email}`, WINDOW), hit(`reset-ip:${ip}`, WINDOW)]);
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, active: users.active })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);
  if (user?.active) {
    const token = await createResetToken(db, user.id, null);
    const mail = resetMail(user.name, await resetLink(token));
    const sent = await sendSystemMail(user.email, mail.subject, mail.body);
    await audit(db, {
      action: sent.sent ? "password.reset.sent" : "password.reset.undelivered",
      userId: user.id,
      entity: "user",
      entityId: user.id,
      ip,
    });
  }
  return { ok: true, data: undefined, message: SENT };
}

/** A new password through a one-time link: used once, then every session of theirs ends. */
export async function resetPassword(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { token, next } = parsed.data;
  const passwordHash = await hashPassword(next);
  const userId = await db.transaction(async (tx) => {
    const id = await useResetToken(tx, token);
    if (!id) return null;
    // A person switched off since the link was sent keeps the account closed.
    const changed = await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: false, version: sql`${users.version} + 1` })
      .where(and(eq(users.id, id), eq(users.active, true)))
      .returning({ id: users.id });
    if (!changed.length) return null;
    await revokeAllSessionsOf(tx, id);
    await audit(tx, {
      action: "password.reset",
      userId: id,
      entity: "user",
      entityId: id,
    });
    return id;
  });
  if (!userId) return fail("This link has expired or was already used. Ask for a new one.");
  redirect("/login?reset=1");
}

/**
 * After a temporary password: the person's own, not the temporary one again. Other devices
 * are signed out; this one carries on into the office.
 */
export async function setOwnPassword(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ownPasswordSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const [row] = await db
    .select({ hash: users.passwordHash, must: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, user.id));
  if (!row?.must) redirect("/");
  if (await verifyPassword(parsed.data.next, row.hash))
    return {
      ok: false,
      error: "Choose a password of your own, not the temporary one.",
      fieldErrors: { next: ["Not the temporary one"] },
    };
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.next),
      mustChangePassword: false,
      version: sql`${users.version} + 1`,
    })
    .where(eq(users.id, user.id));
  await revokeOtherSessions(user.id);
  await audit(db, {
    action: "password.change",
    userId: user.id,
    entity: "user",
    entityId: user.id,
  });
  redirect("/");
}
