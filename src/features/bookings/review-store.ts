import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db/client";
import { activities, requirementReviews } from "@/server/db/schema";
import { syncBookingRules } from "@/server/rules-sync";

// Internal to the booking's papers: the actions and queries call these after their permission check.

/**
 * A paper sent back opens its step again (legacy: a rejected requirement is not done): the task
 * comes back, and the chain re-plans so what waited on it waits again. Returns whether a step
 * was reopened.
 */
export async function reopenStep(tx: DbOrTx, bookingId: string, ruleCode: string, userId: string) {
  const rows = await tx
    .update(activities)
    .set({
      state: "open",
      doneAt: null,
      doneBy: null,
      version: sql`${activities.version} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(
      and(
        eq(activities.linkKind, "booking"),
        eq(activities.linkId, bookingId),
        eq(activities.ruleCode, ruleCode),
        eq(activities.state, "done"),
      ),
    )
    .returning({ id: activities.id });
  if (rows.length === 0) return false;
  await syncBookingRules(tx, bookingId, userId);
  return true;
}

/** The office's latest word on each paper of the booking. */
export async function latestReviews(tx: DbOrTx, bookingId: string) {
  const rows = await tx
    .select()
    .from(requirementReviews)
    .where(eq(requirementReviews.bookingId, bookingId))
    .orderBy(desc(requirementReviews.createdAt));
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.code) && seen.add(r.code));
}
