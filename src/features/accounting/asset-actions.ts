"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lastMonthEnd, yearsProblem } from "@/domain/assets";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db, type Tx } from "@/server/db/client";
import { fixedAssets } from "@/server/db/schema";
import { updateVersioned } from "@/server/versioned";
import { assertOpen, closedThrough } from "./books-store";
import { guarded, Refused } from "./invoice-store";
import { assetDisposeSchema, assetYearsSchema } from "./schemas";

async function assetOf(tx: Tx, id: string) {
  const [a] = await tx.select().from(fixedAssets).where(eq(fixedAssets.id, id)).for("update");
  if (!a) throw new Refused("This asset no longer exists.");
  return a;
}

/** The years to depreciate over — refused once a booked month is in a closed period. */
export async function setAssetYears(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = assetYearsSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, years } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const a = await assetOf(tx, id);
      const problem = yearsProblem(
        a,
        lastMonthEnd(officeToday()),
        await closedThrough(tx, "share"),
      );
      if (problem) throw new Refused(problem);
      await updateVersioned(
        tx,
        fixedAssets,
        id,
        version,
        { years, updatedBy: user.id },
        "This asset",
      );
      await audit(tx, {
        action: "asset.years",
        userId: user.id,
        entity: "asset",
        entityId: id,
        detail: { from: a.years, to: years },
      });
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting/assets");
  return { ok: true, data: undefined, message: `Depreciated over ${years} years` };
}

/** Sold or scrapped: depreciation stops that month and the book value goes to 663000. */
export async function disposeAsset(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = assetDisposeSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, disposedOn, note } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const a = await assetOf(tx, id);
      if (a.disposedOn) throw new Refused("This asset is already disposed of.");
      if (disposedOn < a.acquiredOn) throw new Refused("It cannot go before it was bought.");
      if (disposedOn > officeToday()) throw new Refused("It is disposed of once it is gone.");
      await assertOpen(tx, disposedOn);
      await updateVersioned(
        tx,
        fixedAssets,
        id,
        version,
        { disposedOn, disposeNote: note, updatedBy: user.id },
        "This asset",
      );
      await audit(tx, {
        action: "asset.dispose",
        userId: user.id,
        entity: "asset",
        entityId: id,
        detail: { disposedOn, note },
      });
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting/assets");
  return { ok: true, data: undefined, message: "Disposed of — taken off the books" };
}
