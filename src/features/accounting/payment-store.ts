import "server-only";
import { assertOpen } from "./books-store";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { payProblem } from "@/domain/accounting";
import { type DiffAccount, openCents, type PaymentMethod, settlement } from "@/domain/payments";
import { audit } from "@/server/audit";
import type { Tx } from "@/server/db/client";
import { bankLines, invoices, paymentAllocations, payments } from "@/server/db/schema";
import { Refused } from "./invoice-store";
import { invoiceMoney } from "./money";
import { readBooks } from "@/server/books-config";
import { type BankRule } from "@/domain/bank-rules";

export type PaymentInput = {
  invoiceId: string;
  amountCents: number;
  date: string;
  method: PaymentMethod;
  reference: string | null;
  writeOff: DiffAccount | null;
  bankLineId: string | null;
  userId: string;
};

/**
 * Books one payment against one invoice, inside the caller's transaction. The invoice row is
 * locked first, so two people (or a person and auto-match) cannot both settle its last euro.
 * The allocation carries what the payment settles — the amount, plus any write-off.
 */
export async function bookPayment(tx: Tx, p: PaymentInput) {
  await assertOpen(tx, p.date);
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, p.invoiceId)).for("update");
  if (!inv || inv.kind === "credit" || inv.status !== "issued")
    throw new Refused("Only an issued invoice or a recorded bill can be paid.");
  if (inv.kind === "bill") {
    const problem = payProblem(
      { grossCents: inv.grossCents ?? 0, approvedAt: inv.approvedAt },
      (await readBooks()).approveOverCents,
    );
    if (problem) throw new Refused(problem);
  }
  const money = (await invoiceMoney(tx, [inv.id])).get(inv.id)!;
  const open = openCents(inv.grossCents ?? 0, money.settled, money.credited);
  const s = settlement(p.amountCents, open, p.writeOff);
  if (s.problem) throw new Refused(s.problem);

  const [pay] = await tx
    .insert(payments)
    .values({
      direction: inv.kind === "bill" ? "out" : "in",
      contactId: inv.customerId,
      date: p.date,
      amountCents: p.amountCents,
      method: p.method,
      reference: p.reference,
      bankLineId: p.bankLineId,
      diffCents: s.diffCents,
      diffAccount: s.diffCents ? p.writeOff : null,
      createdBy: p.userId,
      updatedBy: p.userId,
    })
    .returning({ id: payments.id });
  await tx.insert(paymentAllocations).values({
    paymentId: pay.id,
    invoiceId: inv.id,
    amountCents: s.allocated + s.diffCents,
    createdBy: p.userId,
  });
  if (p.bankLineId)
    await tx
      .update(bankLines)
      .set({ state: "matched", paymentId: pay.id, updatedAt: new Date() })
      .where(eq(bankLines.id, p.bankLineId));
  await audit(tx, {
    action: "payment.book",
    userId: p.userId,
    entity: "invoice",
    entityId: inv.id,
    detail: {
      payment: pay.id,
      amountCents: p.amountCents,
      diffCents: s.diffCents,
      bankLine: p.bankLineId,
    },
  });
  return { paymentId: pay.id, invoiceNumber: inv.number, bookingId: inv.bookingId };
}

/** A statement line booked straight to a rule's account: a payment with no partner, the line matched. */
export async function bookRuleCharge(
  tx: Tx,
  line: { id: string; date: string; amountCents: number; comm: string | null; name: string | null },
  rule: BankRule,
  userId: string,
) {
  await assertOpen(tx, line.date);
  const [pay] = await tx
    .insert(payments)
    .values({
      direction: line.amountCents > 0 ? "in" : "out",
      date: line.date,
      amountCents: Math.abs(line.amountCents),
      method: "bank",
      reference: (line.comm || line.name || rule.label).slice(0, 200),
      bankLineId: line.id,
      chargeAccount: rule.account,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning({ id: payments.id });
  await tx
    .update(bankLines)
    .set({ state: "matched", paymentId: pay.id, updatedBy: userId, updatedAt: new Date() })
    .where(eq(bankLines.id, line.id));
  await audit(tx, {
    action: "payment.charge",
    userId,
    entity: "payment",
    entityId: pay.id,
    detail: { account: rule.account, label: rule.label, amountCents: line.amountCents },
  });
  return { paymentId: pay.id, label: rule.label, account: rule.account };
}

export function refreshMoney(invoiceId?: string | null, bookingId?: string | null) {
  revalidatePath("/accounting", "layout");
  if (invoiceId) revalidatePath(`/accounting/invoices/${invoiceId}`);
  if (bookingId) revalidatePath(`/bookings/${bookingId}`, "layout");
}
