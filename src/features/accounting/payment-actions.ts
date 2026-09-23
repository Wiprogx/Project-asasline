"use server";

import { eq } from "drizzle-orm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db } from "@/server/db/client";
import { bankLines, paymentAllocations, payments } from "@/server/db/schema";
import { updateVersioned } from "@/server/versioned";
import { guarded, Refused } from "./invoice-store";
import { bookPayment, refreshMoney } from "./payment-store";
import { registerPaymentSchema, reversePaymentSchema } from "./schemas";

/** A payment registered by hand (cash, a cheque, or a transfer seen before the statement). */
export async function registerPayment(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = registerPaymentSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const r = await guarded(() =>
    db.transaction((tx) =>
      bookPayment(tx, {
        invoiceId: d.invoiceId,
        amountCents: d.amount,
        date: d.date,
        method: d.method,
        reference: d.reference ?? null,
        writeOff: d.writeOff ?? null,
        bankLineId: null,
        userId: user.id,
      }),
    ),
  );
  if (!r.ok) return r;
  refreshMoney(d.invoiceId, r.value.bookingId);
  return { ok: true, data: undefined, message: `Payment booked on ${r.value.invoiceNumber}` };
}

/**
 * Reversed on today's date with a reason, never deleted: the books show it was booked and
 * undone. Its invoice opens again; its bank line goes back to the lines to match.
 */
export async function reversePayment(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = reversePaymentSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [pay] = await tx.select().from(payments).where(eq(payments.id, id));
      if (!pay || pay.status !== "posted") throw new Refused("This payment is already reversed.");
      await updateVersioned(
        tx,
        payments,
        id,
        version,
        {
          status: "reversed",
          reversedOn: officeToday(),
          reversalReason: reason,
          updatedBy: user.id,
        },
        "This payment",
      );
      if (pay.bankLineId)
        await tx
          .update(bankLines)
          .set({ state: "open", paymentId: null, updatedAt: new Date() })
          .where(eq(bankLines.id, pay.bankLineId));
      const [alloc] = await tx
        .select({ invoiceId: paymentAllocations.invoiceId })
        .from(paymentAllocations)
        .where(eq(paymentAllocations.paymentId, id));
      await audit(tx, {
        action: "payment.reverse",
        userId: user.id,
        entity: "invoice",
        entityId: alloc?.invoiceId,
        detail: { payment: id, reason },
      });
      return alloc?.invoiceId ?? null;
    }),
  );
  if (!r.ok) return r;
  refreshMoney(r.value);
  return { ok: true, data: undefined, message: "Payment reversed" };
}
