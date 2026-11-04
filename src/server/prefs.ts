import "server-only";
import { and, eq } from "drizzle-orm";
import {
  mergeTablePrefs,
  parseTableView,
  type TablePrefs,
  type TableViewSpec,
} from "@/domain/table-prefs";
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

/** The columns and widths a person chose for a list, read safely. */
export async function readTableView<K extends string>(
  userId: string,
  spec: TableViewSpec<K>,
): Promise<TablePrefs<K>> {
  return parseTableView(spec, await readPref(userId, spec.key));
}

/** A change to a person's view of a list laid over what was saved; a part left out is kept. */
export async function writeTableView<K extends string>(
  userId: string,
  spec: TableViewSpec<K>,
  patch: { columns?: readonly K[]; widths?: Record<string, number> },
): Promise<TablePrefs<K>> {
  const next = parseTableView(spec, mergeTablePrefs(await readTableView(userId, spec), patch));
  await writePref(userId, spec.key, next);
  return next;
}
