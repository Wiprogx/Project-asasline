import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db/client";
import { activities } from "@/server/db/schema";
import { syncBookingRules } from "./rules-sync";

/**
 * A booking's document steps settled by what happened (legacy: the CMR closes the loading
 * step, the message sent a "send" step, the feed a "track" step): the open tasks of these rule
 * codes are done, and the chain re-plans so what waited on them opens. Returns the codes that
 * actually moved. Shared by the booking's papers, the messages and the journey.
 */
export async function settleSteps(
  tx: DbOrTx,
  bookingId: string,
  codes: readonly string[],
  userId: string,
): Promise<string[]> {
  if (codes.length === 0) return [];
  const rows = await tx
    .update(activities)
    .set({
      state: "done",
      doneAt: new Date(),
      doneBy: userId,
      version: sql`${activities.version} + 1`,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(
      and(
        eq(activities.linkKind, "booking"),
        eq(activities.linkId, bookingId),
        inArray(activities.ruleCode, [...codes]),
        eq(activities.state, "open"),
      ),
    )
    .returning({ ruleCode: activities.ruleCode });
  if (rows.length === 0) return [];
  await syncBookingRules(tx, bookingId, userId);
  return [...new Set(rows.map((r) => r.ruleCode).filter((c): c is string => !!c))];
}
