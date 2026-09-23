import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invoiceTotals } from "@/domain/invoicing";
import { type ActionResult, fail } from "@/lib/action-result";
import type { Tx } from "@/server/db/client";
import { invoiceLines, invoices } from "@/server/db/schema";
import { ConflictError } from "@/server/versioned";

/** A refusal the person can act on, shown as the form's error. */
export class Refused extends Error {}

export async function liveLines(tx: Tx, invoiceId: string) {
  return tx
    .select()
    .from(invoiceLines)
    .where(and(eq(invoiceLines.invoiceId, invoiceId), isNull(invoiceLines.archivedAt)));
}

/** Totals are stored on the invoice so lists and reports never recompute them. */
export async function storeTotals(tx: Tx, invoiceId: string) {
  const t = invoiceTotals(await liveLines(tx, invoiceId));
  await tx
    .update(invoices)
    .set({ netCents: t.netCents, vatCents: t.vatCents, grossCents: t.grossCents })
    .where(eq(invoices.id, invoiceId));
  return t;
}

/** Loads an invoice inside the transaction and checks it is still a draft. */
export async function draftOf(tx: Tx, id: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, id));
  if (!inv) throw new ConflictError("This invoice");
  if (inv.status !== "draft")
    throw new Refused("Only a draft can change; an issued invoice is corrected by a credit note.");
  return inv;
}

export function refreshInvoice(id: string, bookingId: string | null) {
  revalidatePath("/accounting", "layout");
  revalidatePath(`/accounting/invoices/${id}`);
  if (bookingId) revalidatePath(`/bookings/${bookingId}`, "layout");
}

type Failure = Extract<ActionResult<never>, { ok: false }>;

export async function guarded<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | Failure> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    if (e instanceof ConflictError || e instanceof Refused) return fail(e.message) as Failure;
    throw e;
  }
}
