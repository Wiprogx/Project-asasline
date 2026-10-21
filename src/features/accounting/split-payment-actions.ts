"use server";

import { redirect } from "next/navigation";
import { toCents } from "@/domain/money";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { guarded } from "./invoice-store";
import { refreshMoney } from "./payment-store";
import { splitPaymentSchema } from "./schemas";
import { bookSplitPayment } from "./split-payment-store";

/** The parts typed as part.<invoiceId>, in cents; an empty box takes nothing. */
function partsOf(fd: FormData): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("part.") || typeof v !== "string" || !v.trim()) continue;
    const c = toCents(v);
    if (c === null) return null;
    out[k.slice(5)] = c;
  }
  return out;
}

/** One transfer that settles several invoices of a customer (legacy pfApply): one payment, one part each. */
export async function registerSplitPayment(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.bank");
  const parsed = splitPaymentSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const parts = partsOf(fd);
  if (!parts) return fail("Amounts like 1250 or 1250.00.");
  const d = parsed.data;
  const r = await guarded(() =>
    db.transaction((tx) =>
      bookSplitPayment(tx, {
        customerId: d.customerId,
        parts,
        date: d.date,
        method: d.method,
        reference: d.reference ?? null,
        userId: user.id,
      }),
    ),
  );
  if (!r.ok) return r;
  refreshMoney();
  redirect("/accounting/payments");
}
