import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { env } from "@/env";
import { db, type DbOrTx } from "../db/client";
import { passwordResets, users } from "../db/schema";

/** A reset link works for an hour, once. */
const LIFETIME_MS = 60 * 60_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function requestIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/**
 * A new one-time token for the person; an older link not yet used stops working, so only the
 * last e-mail opens. The token is returned once and never stored, only its hash.
 */
export async function createResetToken(tx: DbOrTx, userId: string, createdBy: string | null) {
  const token = randomBytes(32).toString("base64url");
  await tx
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));
  await tx.insert(passwordResets).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + LIFETIME_MS),
    createdBy,
    ip: await requestIp(),
  });
  return token;
}

/** The person a live, unused link belongs to (an active one), or null. Reads without using it. */
export async function resetTokenUser(token: string) {
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(passwordResets)
    .innerJoin(users, eq(users.id, passwordResets.userId))
    .where(
      and(
        eq(passwordResets.id, hashToken(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
        eq(users.active, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Marks the link used, in the transaction that sets the new password: its owner, or null if it was not live. */
export async function useResetToken(tx: DbOrTx, token: string): Promise<string | null> {
  const rows = await tx
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResets.id, hashToken(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .returning({ userId: passwordResets.userId });
  return rows[0]?.userId ?? null;
}

/** The link in the e-mail: the office's own address (APP_URL), else the one this request came to. */
export async function resetLink(token: string) {
  const h = await headers();
  const origin =
    env.APP_URL ??
    `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  return `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;
}
