"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { dueDateOf, remainingQty } from "@/domain/invoicing";
import { ogmMake } from "@/domain/ogm";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { readPaymentTerms } from "@/server/accounting-config";
import { officeToday } from "@/server/clock";
import { db, type Tx } from "@/server/db/client";
import { invoiceLines, invoices, quotationLines } from "@/server/db/schema";
import { nextInvoiceNumber } from "@/server/sequences";
import { updateVersioned } from "@/server/versioned";
import { draftOf, guarded, liveLines, refreshInvoice, Refused, storeTotals } from "./invoice-store";
import { creditSchema, discardSchema, issueSchema } from "./schemas";

/**
 * Two drafts may pick the same booking line; whichever is issued second must still fit in
 * what is left of that line, counting every other issued invoice and credit note.
 */
async function checkNotOverBilled(tx: Tx, bookingId: string, invoiceId: string) {
  const lines = (await liveLines(tx, invoiceId)).filter((l) => l.sourceKey?.startsWith("q:"));
  if (lines.length === 0) return;
  const source = await tx
    .select({ id: quotationLines.id, qty: quotationLines.qty })
    .from(quotationLines)
    .where(
      inArray(
        quotationLines.id,
        lines.map((l) => l.sourceKey!.slice(2)),
      ),
    );
  const issued = await tx
    .select({ key: invoiceLines.sourceKey, qty: invoiceLines.qty, kind: invoices.kind })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(
      and(
        eq(invoices.bookingId, bookingId),
        eq(invoices.status, "issued"),
        ne(invoices.id, invoiceId),
        isNull(invoiceLines.archivedAt),
      ),
    );
  for (const l of lines) {
    const q = source.find((x) => `q:${x.id}` === l.sourceKey);
    const left = remainingQty(
      q?.qty ?? 0,
      issued.filter((x) => x.key === l.sourceKey),
    );
    if (l.qty > left)
      throw new Refused(
        `Only ${left} left to invoice on "${l.description}" — another invoice took the rest. Lower it or remove it.`,
      );
  }
}

/**
 * Issue: the next number of the year's unbroken series, today's date in Brussels, the due
 * date from the payment term, the +++OGM+++ reference. From here on the invoice is frozen.
 */
export async function issueInvoice(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = issueSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version } = parsed.data;
  const terms = await readPaymentTerms();

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const inv = await draftOf(tx, id);
      if ((await liveLines(tx, id)).length === 0)
        throw new Refused("An invoice needs at least one line.");
      if (inv.bookingId) await checkNotOverBilled(tx, inv.bookingId, id);
      const totals = await storeTotals(tx, id);
      const today = officeToday();
      const termId = parsed.data.paymentTermId ?? inv.paymentTermId;
      const number = await nextInvoiceNumber(tx, inv.kind, today);
      await updateVersioned(
        tx,
        invoices,
        id,
        version,
        {
          status: "issued",
          number,
          issueDate: today,
          dueDate: dueDateOf(today, terms.find((t) => t.id === termId) ?? null),
          paymentTermId: termId,
          ogm: inv.kind === "invoice" ? ogmMake(number) : null,
          updatedBy: user.id,
        },
        "This invoice",
      );
      await audit(tx, {
        action: "invoice.issue",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { number, grossCents: totals.grossCents },
      });
      return { bookingId: inv.bookingId, number };
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value.bookingId);
  return { ok: true, data: undefined, message: `Issued as ${r.value.number}` };
}

/** A draft that should not go out: kept with its reason, never deleted, never numbered. */
export async function discardDraft(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = discardSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const inv = await draftOf(tx, id);
      await updateVersioned(
        tx,
        invoices,
        id,
        version,
        { status: "discarded", reason, updatedBy: user.id },
        "This invoice",
      );
      await audit(tx, {
        action: "invoice.discard",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { reason },
      });
      return inv.bookingId;
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value);
  return { ok: true, data: undefined, message: "Draft discarded" };
}

/**
 * Correct an issued invoice: a credit note for the whole of it, issued at once in its own
 * series, and — if asked — a new draft with the same lines to fix and issue again.
 */
export async function creditInvoice(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = creditSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason, redraft } = parsed.data;

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const [orig] = await tx.select().from(invoices).where(eq(invoices.id, id));
      if (!orig || orig.kind !== "invoice" || orig.status !== "issued")
        throw new Refused("Only an issued invoice can be credited.");
      const [already] = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.creditOfId, id), eq(invoices.status, "issued")));
      if (already) throw new Refused("This invoice is already credited.");
      await updateVersioned(tx, invoices, id, version, { updatedBy: user.id }, "This invoice");

      const lines = await liveLines(tx, id);
      const today = officeToday();
      const number = await nextInvoiceNumber(tx, "credit", today);
      const base = {
        customerId: orig.customerId,
        bookingId: orig.bookingId,
        createdBy: user.id,
        updatedBy: user.id,
      };
      const [cn] = await tx
        .insert(invoices)
        .values({
          ...base,
          kind: "credit",
          status: "issued",
          number,
          creditOfId: id,
          reason,
          issueDate: today,
          dueDate: today,
        })
        .returning({ id: invoices.id });
      const copy = (invoiceId: string) =>
        lines.map((l, i) => ({
          invoiceId,
          position: i,
          sourceKey: l.sourceKey,
          description: l.description,
          qty: l.qty,
          unitCents: l.unitCents,
          vatCode: l.vatCode,
          account: l.account,
          createdBy: user.id,
        }));
      await tx.insert(invoiceLines).values(copy(cn.id));
      await storeTotals(tx, cn.id);
      await audit(tx, {
        action: "invoice.credit",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { creditNote: number, reason },
      });

      let draftId: string | null = null;
      if (redraft) {
        const [d] = await tx
          .insert(invoices)
          .values({ ...base, paymentTermId: orig.paymentTermId })
          .returning({ id: invoices.id });
        await tx.insert(invoiceLines).values(copy(d.id));
        await storeTotals(tx, d.id);
        draftId = d.id;
      }
      return { bookingId: orig.bookingId, creditId: cn.id, draftId };
    }),
  );
  if (!r.ok) return r;
  refreshInvoice(id, r.value.bookingId);
  redirect(`/accounting/invoices/${r.value.draftId ?? r.value.creditId}`);
}
