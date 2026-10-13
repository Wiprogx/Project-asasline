"use server";

import { eq } from "drizzle-orm";
import { BL_STEP, blNote, blProblem } from "@/domain/bl-confirm";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { openAutoTask } from "@/server/auto-tasks";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bookings, contacts } from "@/server/db/schema";
import { blConfirmSchema } from "./file-schemas";
import { giveWord } from "./review-store";

/**
 * What came back on the draft B/L (legacy blConfirm): confirmed as it is — the step is done —
 * or a correction is wanted, written down from a WhatsApp or an e-mail, never a call: the step
 * goes back with the wording, and the task to send the correction to the line opens.
 */
export async function confirmBl(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("documents.upload");
  const parsed = blConfirmSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, outcome, channel, text } = parsed.data;
  const problem = blProblem(outcome, channel, text);
  if (problem)
    return {
      ok: false,
      error: problem,
      fieldErrors:
        outcome === "fix" && channel === "call" ? { channel: [problem] } : { text: [problem] },
    };
  const moved = await giveWord(user.id, {
    bookingId,
    code: BL_STEP,
    note: blNote(outcome, channel, text),
    state: outcome === "ok" ? "checked" : "sent_back",
  });
  if (typeof moved === "string") return fail(moved);
  if (outcome === "ok") return { ok: true, data: undefined, message: "B/L confirmed" };
  const [b] = await db
    .select({ ref: bookings.ref, client: contacts.name })
    .from(bookings)
    .innerJoin(contacts, eq(contacts.id, bookings.clientId))
    .where(eq(bookings.id, bookingId));
  if (b)
    await openAutoTask(db, {
      trigger: "bl_correction",
      vars: { ref: b.ref, client: b.client },
      link: { kind: "booking", id: bookingId },
      userId: user.id,
      today: officeToday(),
    });
  return { ok: true, data: undefined, message: "Correction recorded — task added" };
}
