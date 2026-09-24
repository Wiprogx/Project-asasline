"use server";

import { and, eq, isNull, max } from "drizzle-orm";
import { redirect } from "next/navigation";
import { payerProblem, remainingQty } from "@/domain/invoicing";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, invoiceLines, invoices, quotationLines } from "@/server/db/schema";
import { updateVersioned } from "@/server/versioned";
import { draftOf, guarded, refreshInvoice, Refused, storeTotals } from "./invoice-store";
import {
  addLineSchema,
  blankDraftSchema,
  fromBookingSchema,
  pickedLines,
  removeLineSchema,
} from "./schemas";

/**
 * A draft from a booking's lines, for one payer. The payer must be a party on the booking
 * (legacy 10.3) and no line may be billed beyond what is left of it.
 */
export async function draftFromBooking(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = fromBookingSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const picked = pickedLines(fd);
  if (picked.length === 0) return fail("Pick at least one line and a quantity.");
  const { bookingId, payerId } = parsed.data;

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId));
      if (!b) throw new Refused("That booking no longer exists.");
      const problem = payerProblem(payerId, [
        b.clientId,
        b.payerId,
        b.shipperId,
        b.consigneeId,
        b.notifyId,
      ]);
      if (problem) throw new Refused(problem);
      if (!b.quotationRouteId)
        throw new Refused(
          "This booking has no quotation to invoice from; start a blank invoice instead.",
        );

      // Only the booking's own destination, and never a line taken off the quotation.
      const source = await tx
        .select({ line: quotationLines })
        .from(quotationLines)
        .where(
          and(eq(quotationLines.routeId, b.quotationRouteId), isNull(quotationLines.archivedAt)),
        );
      const billed = await tx
        .select({ key: invoiceLines.sourceKey, qty: invoiceLines.qty, kind: invoices.kind })
        .from(invoiceLines)
        .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
        .where(
          and(
            eq(invoices.bookingId, bookingId),
            eq(invoices.status, "issued"),
            isNull(invoiceLines.archivedAt),
          ),
        );

      const [customer] = await tx
        .select({ termId: contacts.paymentTermId })
        .from(contacts)
        .where(eq(contacts.id, payerId));
      const [inv] = await tx
        .insert(invoices)
        .values({
          customerId: payerId,
          bookingId,
          paymentTermId: customer?.termId,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: invoices.id });

      for (const [i, p] of picked.entries()) {
        const q = source.find(({ line }) => `q:${line.id}` === p.key)?.line;
        if (!q) throw new Refused("A picked line is no longer on the quotation. Reload the page.");
        const left = remainingQty(
          q.qty,
          billed.filter((x) => x.key === p.key),
        );
        if (p.qty > left) throw new Refused(`Only ${left} left to invoice on "${q.description}".`);
        await tx.insert(invoiceLines).values({
          invoiceId: inv.id,
          position: i,
          sourceKey: p.key,
          description: q.description,
          qty: p.qty,
          unitCents: q.sellCents ?? 0,
          vatCode: q.vatCode,
          createdBy: user.id,
        });
      }
      await storeTotals(tx, inv.id);
      await audit(tx, {
        action: "invoice.draft",
        userId: user.id,
        entity: "invoice",
        entityId: inv.id,
        detail: { booking: b.ref },
      });
      return inv.id;
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(r.value, bookingId);
  redirect(`/accounting/invoices/${r.value}`);
}

/** A draft not tied to a booking (a service, a storage charge…): lines are added by hand. */
export async function blankDraft(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = blankDraftSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const [customer] = await db
    .select({ termId: contacts.paymentTermId })
    .from(contacts)
    .where(eq(contacts.id, parsed.data.customerId));
  const [inv] = await db
    .insert(invoices)
    .values({
      customerId: parsed.data.customerId,
      paymentTermId: customer?.termId,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: invoices.id });
  refreshInvoice(inv.id, null);
  redirect(`/accounting/invoices/${inv.id}`);
}

export async function addLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = addLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, unit, ...line } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const inv = await draftOf(tx, id);
      const [{ last }] = await tx
        .select({ last: max(invoiceLines.position) })
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, id));
      await tx.insert(invoiceLines).values({
        ...line,
        invoiceId: id,
        unitCents: unit,
        position: (last ?? -1) + 1,
        createdBy: user.id,
      });
      await updateVersioned(tx, invoices, id, version, { updatedBy: user.id }, "This invoice");
      await storeTotals(tx, id);
      return inv.bookingId;
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value);
  return { ok: true, data: undefined, message: "Line added" };
}

/** A draft's line is archived, not deleted: drafts are cheap, their history is not. */
export async function removeLine(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = removeLineSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, lineId } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const inv = await draftOf(tx, id);
      await tx
        .update(invoiceLines)
        .set({
          archivedAt: new Date(),
          archivedBy: user.id,
          archivedReason: "removed from the draft",
        })
        .where(and(eq(invoiceLines.id, lineId), eq(invoiceLines.invoiceId, id)));
      await updateVersioned(tx, invoices, id, version, { updatedBy: user.id }, "This invoice");
      await storeTotals(tx, id);
      return inv.bookingId;
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value);
  return { ok: true, data: undefined, message: "Line removed" };
}
