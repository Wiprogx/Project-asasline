"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ReviewState } from "@/domain/files";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { bookings, requirementReviews } from "@/server/db/schema";
import { checkSchema, sendBackSchema } from "./file-schemas";
import { settleStep } from "./file-store";
import { reopenStep } from "./review-store";

type Word = { bookingId: string; code: string; note: string | null; state: ReviewState };

/** Writes the word and moves the step with it, in one transaction; says whether the step moved. */
async function giveWord(userId: string, w: Word): Promise<boolean | string> {
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

/** The paper is right (legacy verified): the office's word, and its step is done — with or without a file. */
export async function checkRequirement(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = checkSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, code, reason } = parsed.data;
  const moved = await giveWord(user.id, {
    bookingId,
    code,
    note: reason || null,
    state: "checked",
  });
  if (typeof moved === "string") return fail(moved);
  return {
    ok: true,
    data: undefined,
    message: moved ? `${code} checked — the step is done` : `${code} checked`,
  };
}

/** The paper goes back with a reason (legacy rejected): its step opens again until a corrected one is filed. */
export async function sendBackRequirement(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = sendBackSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, code, reason } = parsed.data;
  const moved = await giveWord(user.id, { bookingId, code, note: reason, state: "sent_back" });
  if (typeof moved === "string") return fail(moved);
  return {
    ok: true,
    data: undefined,
    message: moved ? `${code} sent back — the step is open again` : `${code} sent back`,
  };
}
