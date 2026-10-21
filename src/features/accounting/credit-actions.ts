"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { partProblem } from "@/domain/credit-lines";
import { type ActionResult, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { db, type Tx } from "@/server/db/client";
import { invoiceLines, invoices } from "@/server/db/schema";
import { updateVersioned } from "@/server/versioned";
import { assertOpen } from "./books-store";
import { creditableLines, issueCreditNote } from "./credit-store";
import { guarded, refreshInvoice, Refused, storeTotals } from "./invoice-store";
import { creditPartSchema, creditSchema } from "./schemas";

async function issuedInvoice(tx: Tx, id: string, version: number, userId: string) {
  const [orig] = await tx.select().from(invoices).where(eq(invoices.id, id));
  if (!orig || orig.kind !== "invoice" || orig.status !== "issued")
    throw new Refused("Only an issued invoice can be credited.");
  await updateVersioned(tx, invoices, id, version, { updatedBy: userId }, "This invoice");
  return orig;
}

/**
 * Correct an issued invoice: a credit note for all of it still to credit, issued at once in its
 * own series, and — if asked — a new draft with those lines to fix and issue again.
 */
export async function creditInvoice(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = creditSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason, redraft } = parsed.data;

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const orig = await issuedInvoice(tx, id, version, user.id);
      const give = (await creditableLines(tx, id))
        .filter((x) => x.left > 0)
        .map((x) => ({ line: x.line, qty: x.left }));
      if (!give.length) throw new Refused("This invoice is already credited in full.");
      const today = officeToday();
      await assertOpen(tx, today);
      const cn = await issueCreditNote(tx, { orig, give, reason, userId: user.id, today });
      await audit(tx, {
        action: "invoice.credit",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { creditNote: cn.number, reason },
      });
      let draftId: string | null = null;
      if (redraft) {
        const [d] = await tx
          .insert(invoices)
          .values({
            customerId: orig.customerId,
            bookingId: orig.bookingId,
            paymentTermId: orig.paymentTermId,
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning({ id: invoices.id });
        await tx.insert(invoiceLines).values(
          give.map(({ line: l, qty }, i) => ({
            invoiceId: d.id,
            position: i,
            sourceKey: l.sourceKey,
            description: l.description,
            qty,
            unitCents: l.unitCents,
            vatCode: l.vatCode,
            account: l.account,
            createdBy: user.id,
          })),
        );
        await storeTotals(tx, d.id);
        draftId = d.id;
      }
      return { bookingId: orig.bookingId, creditId: cn.id, draftId };
    }),
  );
  if (!r.ok) return r;
  await refreshInvoice(id, r.value.bookingId);
  redirect(`/accounting/invoices/${r.value.draftId ?? r.value.creditId}`);
}

/** The quantities typed as `qty.<lineId>` on the part-credit form. */
function askedOf(fd: FormData): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of fd.entries())
    if (k.startsWith("qty.") && typeof v === "string" && v.trim()) out[k.slice(4)] = Number(v);
  return out;
}

/** Credit part of an invoice (legacy creditPart): a line in full, or fewer of it; the invoice stays. */
export async function creditPart(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = creditPartSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const { id, version, reason } = parsed.data;
  const asked = askedOf(fd);

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const orig = await issuedInvoice(tx, id, version, user.id);
      const lines = await creditableLines(tx, id);
      const left = Object.fromEntries(lines.map((x) => [x.line.id, x.left]));
      const named = (lineId: string) =>
        lines.find((x) => x.line.id === lineId)?.line.description ?? "A line";
      const problem = partProblem(asked, left, named);
      if (problem) throw new Refused(problem);
      const give = lines
        .filter((x) => (asked[x.line.id] ?? 0) > 0)
        .map((x) => ({ line: x.line, qty: asked[x.line.id] }));
      const today = officeToday();
      await assertOpen(tx, today);
      const cn = await issueCreditNote(tx, { orig, give, reason, userId: user.id, today });
      await audit(tx, {
        action: "invoice.credit.part",
        userId: user.id,
        entity: "invoice",
        entityId: id,
        detail: { creditNote: cn.number, reason, lines: give.map((g) => g.line.description) },
      });
      return { bookingId: orig.bookingId, creditId: cn.id };
    }),
  );
  if (!r.ok) return r;
  await refreshInvoice(id, r.value.bookingId);
  redirect(`/accounting/invoices/${r.value.creditId}`);
}
