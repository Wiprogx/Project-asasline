import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { openCents, type PaymentMethod } from "@/domain/payments";
import { type Allocation, splitProblem, splitTotal } from "@/domain/split-payment";
import { audit } from "@/server/audit";
import type { Tx } from "@/server/db/client";
import { invoices, paymentAllocations, payments } from "@/server/db/schema";
import { assertOpen } from "./books-store";
import { Refused } from "./invoice-store";
import { invoiceMoney } from "./money";

// Internal to the split payment action: it calls this after its permission check.

/**
 * Books one payment from a customer over several of their issued invoices, inside the caller's
 * transaction. The invoices are locked first, so nobody settles their last euro in between;
 * the payment is the sum of the parts, one allocation per invoice.
 */
export async function bookSplitPayment(
  tx: Tx,
  p: {
    customerId: string;
    parts: Record<string, number>;
    date: string;
    method: PaymentMethod;
    reference: string | null;
    userId: string;
  },
) {
  await assertOpen(tx, p.date);
  const ids = Object.keys(p.parts);
  const rows = ids.length
    ? await tx
        .select()
        .from(invoices)
        .where(and(inArray(invoices.id, ids), eq(invoices.customerId, p.customerId)))
        .for("update")
    : [];
  if (rows.length !== ids.length || rows.some((i) => i.kind !== "invoice" || i.status !== "issued"))
    throw new Refused("Only this customer's issued invoices can be paid here.");
  const money = await invoiceMoney(tx, ids);
  const parts: Allocation[] = rows.map((i) => {
    const m = money.get(i.id)!;
    return {
      invoiceId: i.id,
      number: i.number ?? "",
      cents: p.parts[i.id],
      openCents: openCents(i.grossCents ?? 0, m.settled, m.credited),
    };
  });
  const problem = splitProblem(parts);
  if (problem) throw new Refused(problem);
  const taken = parts.filter((x) => x.cents > 0);

  const [pay] = await tx
    .insert(payments)
    .values({
      direction: "in",
      contactId: p.customerId,
      date: p.date,
      amountCents: splitTotal(taken),
      method: p.method,
      reference: p.reference,
      createdBy: p.userId,
      updatedBy: p.userId,
    })
    .returning({ id: payments.id });
  await tx.insert(paymentAllocations).values(
    taken.map((x) => ({
      paymentId: pay.id,
      invoiceId: x.invoiceId,
      amountCents: x.cents,
      createdBy: p.userId,
    })),
  );
  for (const x of taken)
    await audit(tx, {
      action: "payment.book",
      userId: p.userId,
      entity: "invoice",
      entityId: x.invoiceId,
      detail: { payment: pay.id, amountCents: x.cents, split: taken.length },
    });
  return { paymentId: pay.id, count: taken.length, totalCents: splitTotal(taken) };
}
