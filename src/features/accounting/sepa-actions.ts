"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { COMPANY } from "@/domain/company";
import { sepaXml } from "@/domain/sepa";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeNow, officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { invoices, sepaBatches, sepaBatchItems } from "@/server/db/schema";
import { assertOpen } from "./books-store";
import { guarded, Refused } from "./invoice-store";
import { sepaCancelSchema, sepaFileSchema } from "./schemas";
import { payableBills } from "./sepa-store";

/**
 * Makes the SEPA file for the ticked bills. The bills are locked and checked again (open,
 * approved, a valid IBAN, not in another file), so two people cannot put one bill in two
 * files. Nothing is booked: each payment is booked when the statement shows it.
 */
export async function makeSepaFile(
  _p: ActionResult<{ batchId: string }>,
  fd: FormData,
): Promise<ActionResult<{ batchId: string }>> {
  const user = await requirePermission("accounting.bank");
  const parsed = sepaFileSchema.safeParse({ ...formToObject(fd), ids: fd.getAll("ids") });
  if (!parsed.success) return invalid(parsed.error);
  const { ids, executionDate } = parsed.data;
  const today = officeToday();
  if (executionDate < today) return { ok: false, error: "The execution date is in the past." };
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      await assertOpen(tx, executionDate);
      await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(inArray(invoices.id, ids))
        .for("update");
      const bills = await payableBills(tx, ids);
      if (bills.length !== ids.length) throw new Refused("A ticked bill is no longer open.");
      const stopped = bills.find((b) => b.problem);
      if (stopped) throw new Refused(`${stopped.number}: ${stopped.problem}.`);
      const msgId = `ASAS-${executionDate.replace(/-/g, "")}-${randomUUID().slice(0, 8)}`;
      const xml = sepaXml({
        msgId,
        createdAt: officeNow(),
        executionDate,
        debtor: { name: COMPANY.name, iban: COMPANY.iban, bic: COMPANY.bic },
        payments: bills.map((b) => ({
          endToEndId: b.number ?? b.id,
          amountCents: b.openCents,
          creditor: b.supplier,
          iban: b.iban!,
          bic: b.bic,
          reference: [b.supplierRef, b.number].filter(Boolean).join(" "),
        })),
      });
      const total = bills.reduce((s, b) => s + b.openCents, 0);
      const [batch] = await tx
        .insert(sepaBatches)
        .values({ msgId, executionDate, totalCents: total, xml, createdBy: user.id })
        .returning({ id: sepaBatches.id });
      await tx.insert(sepaBatchItems).values(
        bills.map((b) => ({
          batchId: batch.id,
          invoiceId: b.id,
          amountCents: b.openCents,
          iban: b.iban!,
          createdBy: user.id,
        })),
      );
      await audit(tx, {
        action: "sepa.file",
        userId: user.id,
        entity: "sepa",
        entityId: batch.id,
        detail: { msgId, count: bills.length, totalCents: total },
      });
      return batch.id;
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting/sepa");
  return {
    ok: true,
    data: { batchId: r.value },
    message: `SEPA file ready — ${ids.length} payment${ids.length === 1 ? "" : "s"}`,
  };
}

/** The bank refused the file: cancelled with a reason, its bills can go in a new one. */
export async function cancelSepaBatch(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = sepaCancelSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, reason } = parsed.data;
  const archived = { archivedAt: new Date(), archivedBy: user.id, archivedReason: reason };
  await db.transaction(async (tx) => {
    await tx.update(sepaBatches).set(archived).where(eq(sepaBatches.id, id));
    await tx
      .update(sepaBatchItems)
      .set(archived)
      .where(and(eq(sepaBatchItems.batchId, id)));
    await audit(tx, {
      action: "sepa.cancel",
      userId: user.id,
      entity: "sepa",
      entityId: id,
      detail: { reason },
    });
  });
  revalidatePath("/accounting/sepa");
  return {
    ok: true,
    data: undefined,
    message: "SEPA file cancelled — its bills can be paid again",
  };
}
