"use server";

import { FX_UNIT, fxLine, parseFx } from "@/domain/fx";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { invoices } from "@/server/db/schema";
import { updateVersioned } from "@/server/versioned";
import { draftOf, guarded, refreshInvoice, storeTotals } from "./invoice-store";
import { currencySchema } from "./schemas";

/**
 * A draft in dollars or pounds (legacy cur / fx): its lines stay in that currency and the
 * books keep the euro at the rate given — their rate on a supplier's bill, ours on a sale.
 * The rate freezes with the document when it is issued.
 */
export async function setCurrency(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = currencySchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, currency } = parsed.data;
  const fxBp = currency === "EUR" ? FX_UNIT : parseFx(parsed.data.fx);
  if (fxBp === null)
    return {
      ok: false,
      error: `Enter the exchange rate — euro for one ${currency}.`,
      fieldErrors: { fx: [`Euro for one ${currency}, like 0.92`] },
    };
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const inv = await draftOf(tx, id);
      await updateVersioned(
        tx,
        invoices,
        id,
        version,
        { currency, fxBp, updatedBy: user.id },
        "This document",
      );
      const totals = await storeTotals(tx, id);
      await audit(tx, {
        action: "invoice.currency",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { currency, fxBp, grossCents: totals.grossCents },
      });
      return inv.bookingId;
    }),
  );
  if (!r.ok) return r;
  await refreshInvoice(id, r.value);
  return {
    ok: true,
    data: undefined,
    message: currency === "EUR" ? "In euro" : `In ${currency} at ${fxLine(currency, fxBp)}`,
  };
}
