import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "./db/client";
import { userPrefs } from "./db/schema";

/**
 * A person's own screen preferences (user_prefs): one JSON value per key, read raw — the caller
 * parses it safely (domain/table-prefs), since an older save may name columns since gone.
 */
export async function readPref(userId: string, key: string): Promise<unknown> {
  const [row] = await db
    .select({ value: userPrefs.value })
    .from(userPrefs)
    .where(and(eq(userPrefs.userId, userId), eq(userPrefs.key, key)));
  return row?.value ?? null;
}

/** Last write wins: a preference is the person's own, nobody else edits it. */
export async function writePref(userId: string, key: string, value: unknown): Promise<void> {
  await db
    .insert(userPrefs)
    .values({ userId, key, value })
    .onConflictDoUpdate({
      target: [userPrefs.userId, userPrefs.key],
      set: { value, updatedAt: new Date() },
    });
}
