"use server";

import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { dueDateOf, remainingQty } from "@/domain/invoicing";
import { ogmMake } from "@/domain/ogm";
import { creditProblem } from "@/domain/reminders";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { readPaymentTerms } from "@/server/accounting-config";
import { officeToday } from "@/server/clock";
import { assertOpen } from "./books-store";
import { db, type Tx } from "@/server/db/client";
import {
  bookingFiles,
  bookings,
  contacts,
  invoiceLines,
  invoices,
  quotationLines,
} from "@/server/db/schema";
import { nextInvoiceNumber } from "@/server/sequences";
import { updateVersioned } from "@/server/versioned";
import { draftOf, guarded, liveLines, refreshInvoice, Refused, storeTotals } from "./invoice-store";
import { exposureOf } from "./reminder-store";
import { discardSchema, issueSchema } from "./schemas";
import { EXEMPTION_WARNING, exemptionProofMissing } from "@/domain/exemption";

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
      await assertOpen(tx, today);
      const termId = parsed.data.paymentTermId ?? inv.paymentTermId;
      const number = await nextInvoiceNumber(tx, inv.kind, today);
      const [shipment] = inv.bookingId
        ? await tx
            .select({ eta: bookings.eta })
            .from(bookings)
            .where(eq(bookings.id, inv.bookingId))
        : [];
      await updateVersioned(
        tx,
        invoices,
        id,
        version,
        {
          status: "issued",
          number,
          issueDate: today,
          dueDate: dueDateOf(
            today,
            terms.find((t) => t.id === termId) ?? null,
            shipment?.eta ?? null,
          ),
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
      const [c] = await tx
        .select({ limit: contacts.creditLimitCents })
        .from(contacts)
        .where(eq(contacts.id, inv.customerId));
      const credit = creditProblem(c?.limit ?? null, await exposureOf(tx, inv.customerId));
      // Exempt under art. 41: the EX-A or the B/L must be on the booking's file (a warning).
      const proofMissing = inv.bookingId
        ? exemptionProofMissing(
            await liveLines(tx, id),
            await tx
              .select({ code: bookingFiles.code, stage: bookingFiles.stage })
              .from(bookingFiles)
              .where(
                and(eq(bookingFiles.bookingId, inv.bookingId), isNull(bookingFiles.archivedAt)),
              ),
          )
        : false;
      return { bookingId: inv.bookingId, number, credit, proofMissing };
    }),
  );
  if (!r.ok) return r;
  await refreshInvoice(id, r.value.bookingId);
  const warn =
    (r.value.credit ? ` — ⚠ ${r.value.credit}` : "") +
    (r.value.proofMissing ? ` — ⚠ ${EXEMPTION_WARNING}` : "");
  return { ok: true, data: undefined, message: `Issued as ${r.value.number}${warn}` };
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
  await refreshInvoice(id, r.value);
  return { ok: true, data: undefined, message: "Draft discarded" };
}
