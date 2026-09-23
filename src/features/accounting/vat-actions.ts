"use server";

import { revalidatePath } from "next/cache";
import { vatPeriodRange } from "@/domain/vat";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { vatFilings } from "@/server/db/schema";
import { closeBooks, closedThrough } from "./books-store";
import { guarded, Refused } from "./invoice-store";
import { closeBooksSchema, fileVatSchema } from "./schemas";
import { computeVatReturn, vatFilingOf } from "./vat-store";

/**
 * Marks a period's return as filed: the grids are kept as sent, and the books close through
 * the period's last day, so nothing can change what was declared.
 */
export async function fileVatReturn(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const parsed = fileVatSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { period } = parsed.data;
  const { to } = vatPeriodRange(period);
  const today = officeToday();
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      if (to >= today) throw new Refused("A period is filed once it is over.");
      if (await vatFilingOf(tx, period)) throw new Refused(`${period} is already filed.`);
      const closed = await closedThrough(tx, "update");
      if (!closed || closed < to) await closeBooks(tx, to, today, user.id);
      // Computed after the close: nothing dated in the period can slip in any more.
      const ret = await computeVatReturn(period);
      await tx.insert(vatFilings).values({
        period,
        grids: Object.fromEntries(ret.grids),
        balanceCents: ret.balanceCents,
        filedBy: user.id,
        createdBy: user.id,
      });
      await audit(tx, {
        action: "vat.file",
        userId: user.id,
        entity: "vat",
        entityId: period,
        detail: { balanceCents: ret.balanceCents },
      });
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting", "layout");
  return {
    ok: true,
    data: undefined,
    message: `${period} marked as filed; the books are closed through ${to}`,
  };
}

/** Closes the books through a past day (a month end, the year end). */
export async function closeBooksThrough(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const parsed = closeBooksSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { through } = parsed.data;
  const r = await guarded(() =>
    db.transaction((tx) => closeBooks(tx, through, officeToday(), user.id)),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting", "layout");
  return { ok: true, data: undefined, message: `The books are closed through ${through}` };
}
