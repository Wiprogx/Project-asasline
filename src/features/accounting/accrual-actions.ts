"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { accrualRuns } from "@/server/db/schema";
import { accrualCandidates } from "./accrual-store";
import { assertOpen } from "./books-store";
import { guarded, Refused } from "./invoice-store";
import { accrualBookSchema, accrualCancelSchema } from "./schemas";

/** Books the costs to receive on a past day, reversed the next day. One live run per day. */
export async function bookAccruals(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const parsed = accrualBookSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { onDate } = parsed.data;
  if (onDate >= officeToday())
    return { ok: false, error: "Costs to receive are booked on a past day." };
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      await assertOpen(tx, onDate);
      const [twice] = await tx
        .select({ id: accrualRuns.id })
        .from(accrualRuns)
        .where(and(eq(accrualRuns.onDate, onDate), isNull(accrualRuns.archivedAt)));
      if (twice)
        throw new Refused(`Costs to receive for ${onDate} are already booked — cancel them first.`);
      const lines = (await accrualCandidates(tx, onDate)).map(({ bookingId, ref, cents }) => ({
        bookingId,
        ref,
        cents,
      }));
      if (lines.length === 0)
        throw new Refused("Nothing to book: every sailed shipment is invoiced.");
      const total = lines.reduce((s, l) => s + l.cents, 0);
      const [run] = await tx
        .insert(accrualRuns)
        .values({ onDate, totalCents: total, lines, createdBy: user.id })
        .returning({ id: accrualRuns.id });
      await audit(tx, {
        action: "accruals.book",
        userId: user.id,
        entity: "accruals",
        entityId: run.id,
        detail: { onDate, totalCents: total },
      });
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting", "layout");
  return {
    ok: true,
    data: undefined,
    message: `Costs to receive booked on ${onDate}, reversed the next day`,
  };
}

/** Undoes a run (both entries) with a reason, while its day is not closed. */
export async function cancelAccruals(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const parsed = accrualCancelSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, reason } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [run] = await tx.select().from(accrualRuns).where(eq(accrualRuns.id, id)).for("update");
      if (!run || run.archivedAt) throw new Refused("This run is already cancelled.");
      await assertOpen(tx, run.onDate);
      await tx
        .update(accrualRuns)
        .set({ archivedAt: new Date(), archivedBy: user.id, archivedReason: reason })
        .where(eq(accrualRuns.id, id));
      await audit(tx, {
        action: "accruals.cancel",
        userId: user.id,
        entity: "accruals",
        entityId: id,
        detail: { reason },
      });
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting", "layout");
  return { ok: true, data: undefined, message: "Costs to receive cancelled" };
}
