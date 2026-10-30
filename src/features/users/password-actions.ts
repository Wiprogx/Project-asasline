"use server";

import { eq, sql } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { hashPassword, temporaryPassword } from "@/server/auth/password";
import { createResetToken, resetLink } from "@/server/auth/reset-tokens";
import { revokeAllSessionsOf } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { sendSystemMail } from "@/server/delivery";
import { resetMail } from "@/domain/password-reset";
import { activeUser, settle } from "./staff";
import { resetLinkSchema, tempPasswordSchema } from "./schemas";

/**
 * A temporary password (typed, or made up and shown once): every session of theirs ends and
 * they choose their own at the next sign-in. Read it out by phone, never by e-mail.
 */
export async function setTemporaryPassword(
  _p: ActionResult<{ password: string } | undefined>,
  fd: FormData,
): Promise<ActionResult<{ password: string } | undefined>> {
  const actor = await requirePermission("app.settings");
  const parsed = tempPasswordSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, password: typed } = parsed.data;
  const password = typed || temporaryPassword();
  const passwordHash = await hashPassword(password);
  return settle(async () => {
    await activeUser(id);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, mustChangePassword: true, version: sql`${users.version} + 1` })
        .where(eq(users.id, id));
      await revokeAllSessionsOf(tx, id);
      await audit(tx, {
        action: "password.temporary",
        userId: actor.id,
        entity: "user",
        entityId: id,
      });
    });
    return typed ? undefined : { password };
  }, "Temporary password set — they were signed out");
}

/**
 * A one-time link by e-mail (an hour). Without a mail server the link is handed to the Admin
 * to pass on; either way the password stays as it is until the link is used.
 */
export async function sendResetLink(
  _p: ActionResult<{ link: string } | undefined>,
  fd: FormData,
): Promise<ActionResult<{ link: string } | undefined>> {
  const actor = await requirePermission("app.settings");
  const parsed = resetLinkSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id } = parsed.data;
  let sent = false;
  const result = await settle<{ link: string } | undefined>(async () => {
    const u = await activeUser(id);
    const link = await resetLink(await createResetToken(db, id, actor.id));
    const mail = resetMail(u.name, link);
    sent = (await sendSystemMail(u.email, mail.subject, mail.body)).sent;
    await audit(db, {
      action: sent ? "password.reset.sent" : "password.reset.undelivered",
      userId: actor.id,
      entity: "user",
      entityId: id,
    });
    return sent ? undefined : { link };
  }, "Reset link sent");
  if (result.ok && !sent)
    return { ...result, message: "No mail server: copy the link and pass it on" };
  return result;
}
