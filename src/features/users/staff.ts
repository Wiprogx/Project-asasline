import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Role } from "@/domain/permissions";
import { staffChangeRefusal } from "@/domain/users";
import { type ActionResult, fail } from "@/lib/action-result";
import { db, type Tx } from "@/server/db/client";
import { users } from "@/server/db/schema";

/** A change the office's rules refuse: said to the Admin as it is. */
export class Refused extends Error {}

const TAKEN = "Someone already uses that email.";
const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && "code" in e && e.code === "23505";

/**
 * Loads the person and the active-Admin count under a row lock, so two Admins demoting each
 * other at the same moment cannot leave the office with none.
 */
export async function guard(
  tx: Tx,
  actorId: string,
  id: string,
  change: { role?: Role; active?: boolean },
) {
  await tx.execute(sql`select 1 from ${users} where ${users.role} = 'admin' for update`);
  const [target] = await tx.select().from(users).where(eq(users.id, id));
  if (!target) throw new Refused("That user no longer exists.");
  const [{ n }] = await tx
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.active, true)));
  const refusal = staffChangeRefusal(actorId, target, change, n);
  if (refusal) throw new Refused(refusal);
  return target;
}

/** Runs a change; a refusal, a taken email or a colleague's newer save becomes the answer. */
export async function settle<T = undefined>(
  fn: () => Promise<NoInfer<T> | void>,
  message: string,
): Promise<ActionResult<T>> {
  let data: T;
  try {
    data = (await fn()) as T;
  } catch (e) {
    if (e instanceof Refused) return fail(e.message);
    if (isUniqueViolation(e)) return { ok: false, error: TAKEN, fieldErrors: { email: [TAKEN] } };
    throw e;
  }
  revalidatePath("/settings/users");
  return { ok: true, data, message };
}

/** An active user, for a password action; a switched-off one is refused. */
export async function activeUser(id: string) {
  const [u] = await db
    .select({ name: users.name, email: users.email, active: users.active })
    .from(users)
    .where(eq(users.id, id));
  if (!u) throw new Refused("That user no longer exists.");
  if (!u.active) throw new Refused("Switch them back on first.");
  return u;
}
