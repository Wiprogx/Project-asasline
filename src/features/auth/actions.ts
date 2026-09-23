"use server";

import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { burnPasswordCheck, verifyPassword } from "@/server/auth/password";
import { createSession, revokeSession } from "@/server/auth/session";
import { getCurrentUser } from "@/server/auth/dal";
import { hit, peek, reset } from "@/server/cache/rate-limit";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { loginSchema } from "./schemas";

const WINDOW = 15 * 60;
const PER_EMAIL = 6;
const PER_IP = 40;
// One answer for wrong password, unknown email and switched-off account (legacy rule).
const GENERIC = "Email or password is not right.";

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formToObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { email, password } = parsed.data;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if ((await peek(`email:${email}`)) >= PER_EMAIL || (await peek(`ip:${ip}`)) >= PER_IP) {
    return fail("Too many attempts. Wait 15 minutes and try again.");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await burnPasswordCheck(password);

  if (!user || !ok || !user.active) {
    await Promise.all([hit(`email:${email}`, WINDOW), hit(`ip:${ip}`, WINDOW)]);
    await audit(db, { action: "login.failed", detail: { email }, ip, userId: user?.id });
    return fail(GENERIC);
  }

  await reset(`email:${email}`);
  await createSession(user.id);
  await audit(db, { action: "login", userId: user.id, ip });
  redirect("/");
}

export async function logout(): Promise<void> {
  const user = await getCurrentUser();
  await revokeSession();
  if (user) await audit(db, { action: "logout", userId: user.id });
  redirect("/login");
}
