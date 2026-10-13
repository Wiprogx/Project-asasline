import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/server/db/client";
import { activities, bookings, requirementReviews } from "@/server/db/schema";
import { revalidatePath } from "next/cache";
import type { ReviewState } from "@/domain/files";
import { audit } from "@/server/audit";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { settleStep } from "./file-store";
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

type Word = { bookingId: string; code: string; note: string | null; state: ReviewState };

/** Writes the word and moves the step with it, in one transaction; says whether the step moved. */
export async function giveWord(userId: string, w: Word): Promise<boolean | string> {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, w.bookingId));
  if (!b) return "This booking no longer exists.";
  if (b.status === "cancelled") return "Put the booking back before reviewing its papers.";
  const moved = await db.transaction(async (tx) => {
    await tx.insert(requirementReviews).values({ ...w, createdBy: userId });
    const moved =
      w.state === "checked"
        ? await settleStep(tx, w.bookingId, w.code, userId)
        : await reopenStep(tx, w.bookingId, w.code, userId);
    await audit(tx, {
      action: w.state === "checked" ? "booking.paper.check" : "booking.paper.sendBack",
      userId,
      entity: "booking",
      entityId: w.bookingId,
      detail: { code: w.code, note: w.note, stepMoved: moved },
    });
    return moved;
  });
  if (moved) await invalidateTags(tags.dashboard); // the home panel counts the open steps
  revalidatePath(`/bookings/${w.bookingId}`, "layout");
  revalidatePath("/activity");
  return moved;
}
