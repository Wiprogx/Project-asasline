"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { approvalProblem, needsApproval } from "@/domain/accounting";
import { defaultYears } from "@/domain/assets";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, fixedAssets, invoices } from "@/server/db/schema";
import { nextInvoiceNumber } from "@/server/sequences";
import { updateVersioned } from "@/server/versioned";
import { assertOpen } from "./books-store";
import { draftOf, guarded, liveLines, refreshInvoice, Refused, storeTotals } from "./invoice-store";
import { approveBillSchema, newBillSchema, recordBillSchema } from "./schemas";

/** A supplier's bill, as a draft: for a booking (a shipment cost) or for the office. */
export async function newBill(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = newBillSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { supplierId, bookingId } = parsed.data;
  if (bookingId) {
    const [b] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (!b) return fail("That booking no longer exists.");
  }
  const [bill] = await db
    .insert(invoices)
    .values({
      kind: "bill",
      customerId: supplierId,
      bookingId,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: invoices.id });
  refreshInvoice(bill.id, bookingId ?? null);
  redirect(`/accounting/invoices/${bill.id}`);
}

/**
 * Records the bill: our own number in the BILL series (so every document in the books has one
 * unbroken sequence), the supplier's number, the date on their paper and when it is due. The
 * same supplier number cannot be recorded twice — the classic way to pay a bill twice.
 */
export async function recordBill(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = recordBillSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, supplierRef, billDate, dueDate } = parsed.data;
  if (dueDate < billDate)
    return {
      ok: false,
      error: "The due date is before the bill's date.",
      fieldErrors: { dueDate: ["Before the bill's date"] },
    };

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const bill = await draftOf(tx, id);
      await assertOpen(tx, billDate);
      if (bill.kind !== "bill") throw new Refused("This is not a supplier bill.");
      const lines = await liveLines(tx, id);
      if (lines.length === 0) throw new Refused("A bill needs at least one line.");
      const [twice] = await tx
        .select({ number: invoices.number })
        .from(invoices)
        .where(
          and(
            eq(invoices.kind, "bill"),
            eq(invoices.customerId, bill.customerId),
            eq(invoices.supplierRef, supplierRef),
            ne(invoices.id, id),
            ne(invoices.status, "discarded"),
          ),
        );
      if (twice)
        throw new Refused(`This supplier's ${supplierRef} is already recorded as ${twice.number}.`);
      const totals = await storeTotals(tx, id);
      const number = await nextInvoiceNumber(tx, "bill", billDate);
      await updateVersioned(
        tx,
        invoices,
        id,
        version,
        { status: "issued", number, supplierRef, issueDate: billDate, dueDate, updatedBy: user.id },
        "This bill",
      );
      // Equipment (class 2) is an asset, depreciated month by month — not a cost of the month.
      const equipment = lines.filter((l) => l.account.startsWith("2"));
      if (equipment.length)
        await tx.insert(fixedAssets).values(
          equipment.map((l) => ({
            name: l.description,
            invoiceId: id,
            invoiceLineId: l.id,
            acquiredOn: billDate,
            costCents: Math.round(l.qty * l.unitCents),
            years: defaultYears(l.description),
            account: l.account,
            createdBy: user.id,
          })),
        );
      await audit(tx, {
        action: "bill.record",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { number, supplierRef, grossCents: totals.grossCents },
      });
      return { number, bookingId: bill.bookingId, needs: needsApproval(totals.grossCents) };
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value.bookingId);
  return {
    ok: true,
    data: undefined,
    message: `Recorded as ${r.value.number}${r.value.needs ? " — needs a second person's approval before payment" : ""}`,
  };
}

/** Four eyes: a bill of €5,000 or more is approved by someone other than who recorded it. */
export async function approveBill(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.approve");
  const parsed = approveBillSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [bill] = await tx.select().from(invoices).where(eq(invoices.id, id));
      if (!bill || bill.kind !== "bill" || bill.status !== "issued")
        throw new Refused("Only a recorded bill is approved.");
      if (bill.approvedAt) throw new Refused("This bill is already approved.");
      const problem = approvalProblem(bill.updatedBy ?? bill.createdBy, user.id);
      if (problem) throw new Refused(problem);
      await updateVersioned(
        tx,
        invoices,
        id,
        version,
        { approvedBy: user.id, approvedAt: new Date() },
        "This bill",
      );
      await audit(tx, { action: "bill.approve", userId: user.id, entity: "invoice", entityId: id });
      return bill.bookingId;
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value);
  return { ok: true, data: undefined, message: "Approved — it can be paid" };
}
