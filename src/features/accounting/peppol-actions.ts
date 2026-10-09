"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ibanOk } from "@/domain/iban";
import { invoiceTotals } from "@/domain/invoicing";
import { formatCents } from "@/domain/money";
import { type ActionResult, fail, formToObject, invalid } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import { contactBankAccounts, contacts, invoiceLines, invoices } from "@/server/db/schema";
import { parseUbl } from "@/server/ubl";
import { guarded, refreshInvoice, Refused } from "./invoice-store";
import { z } from "zod";
import { peppolFile } from "./peppol-queries";
import { rememberedAccount } from "@/domain/line-memory";
import { memoryOf } from "./line-memory-store";

const digits = (v: string) =>
  v
    .toUpperCase()
    .replace(/^[A-Z]{2}/, "")
    .replace(/[^0-9]/g, "");

/**
 * A supplier's Peppol (UBL) invoice becomes a draft bill to check and record: the supplier is
 * found by VAT number (or added as a contact), their IBAN kept for paying them, their number
 * and dates carried over. The same number from the same supplier is refused, and a total that
 * our VAT does not reproduce is said, not hidden.
 */
export async function importUbl(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose the supplier's XML file.");
  if (file.size > 5_000_000) return fail("This file is over 5 MB.");
  const u = parseUbl(await file.text());
  if (!u) return fail(`${file.name} is not a UBL invoice (Peppol BIS).`);
  if (u.credit) return fail("A supplier's credit note is recorded by hand for now.");
  if (u.currency !== "EUR")
    return fail(`${u.number} is in ${u.currency}; only euro bills are read.`);
  if (u.lines.length === 0) return fail(`${u.number} has no lines.`);

  const r = await guarded(() =>
    db.transaction(async (tx) => {
      const vat = digits(u.supplier.vat);
      const [known] = vat
        ? await tx
            .select({ id: contacts.id, name: contacts.name })
            .from(contacts)
            .where(
              and(
                isNull(contacts.archivedAt),
                sql`regexp_replace(upper(coalesce(${contacts.vat}, '')), '^[A-Z]{2}|[^0-9]', '', 'g') = ${vat}`,
              ),
            )
            .limit(1)
        : [];
      const supplier =
        known ??
        (
          await tx
            .insert(contacts)
            .values({
              name: u.supplier.name || `Supplier ${u.supplier.vat}`,
              vat: u.supplier.vat || null,
              country: u.supplier.country,
              createdBy: user.id,
              updatedBy: user.id,
            })
            .returning({ id: contacts.id, name: contacts.name })
        )[0];
      const [twice] = await tx
        .select({ number: invoices.number })
        .from(invoices)
        .where(
          and(
            eq(invoices.kind, "bill"),
            eq(invoices.customerId, supplier.id),
            eq(invoices.supplierRef, u.number),
            ne(invoices.status, "discarded"),
          ),
        );
      if (twice)
        throw new Refused(
          `${u.number} from ${supplier.name} is already in${twice.number ? ` as ${twice.number}` : ""}.`,
        );
      if (u.iban && ibanOk(u.iban)) {
        const [has] = await tx
          .select({ id: contactBankAccounts.id })
          .from(contactBankAccounts)
          .where(
            and(
              eq(contactBankAccounts.contactId, supplier.id),
              eq(contactBankAccounts.iban, u.iban),
              isNull(contactBankAccounts.archivedAt),
            ),
          );
        if (!has)
          await tx.insert(contactBankAccounts).values({
            contactId: supplier.id,
            iban: u.iban,
            label: "From their Peppol invoice",
            createdBy: user.id,
          });
      }
      const ours = invoiceTotals(u.lines).grossCents;
      const note =
        ours === u.totalCents
          ? null
          : `Their total is ${formatCents(u.totalCents)}, ours ${formatCents(ours)} — check the lines before recording.`;
      const [bill] = await tx
        .insert(invoices)
        .values({
          kind: "bill",
          viaPeppol: true,
          customerId: supplier.id,
          supplierRef: u.number,
          issueDate: u.issueDate || null,
          dueDate: u.dueDate,
          note,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning({ id: invoices.id });
      // A line the office booked before goes on the same account (legacy lineMem).
      const memory = known ? await memoryOf(tx, known.id) : [];
      await tx.insert(invoiceLines).values(
        u.lines.map((l, i) => ({
          invoiceId: bill.id,
          position: i,
          description: l.description.slice(0, 500),
          qty: l.qty,
          unitCents: l.unitCents,
          vatCode: l.vatCode,
          account: rememberedAccount(memory, l.description) ?? "619000",
          createdBy: user.id,
        })),
      );
      await audit(tx, {
        action: "bill.import",
        userId: user.id,
        entity: "invoice",
        entityId: bill.id,
        detail: { file: file.name, supplierRef: u.number, newSupplier: !known },
      });
      return bill.id;
    }),
  );
  if (!r.ok) return r;
  await invalidateTags(tags.contacts);
  refreshInvoice(r.value, null);
  redirect(`/accounting/invoices/${r.value}`);
}

/**
 * The office sent the file through the access point (legacy peppol: "sent"): the day is written
 * on the invoice. Refused while the file itself cannot be made.
 */
export async function markPeppolSent(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.issue");
  const parsed = z.object({ id: z.uuid() }).safeParse(formToObject(fd));
  if (!parsed.success) return invalid(parsed.error);
  const file = await peppolFile(parsed.data.id);
  if ("problems" in file) return fail(`Not sent: ${file.problems.join("; ")}.`);
  const rows = await db
    .update(invoices)
    .set({ peppolSentAt: new Date(), peppolSentBy: user.id })
    .where(and(eq(invoices.id, parsed.data.id), isNull(invoices.peppolSentAt)))
    .returning({ id: invoices.id, bookingId: invoices.bookingId, number: invoices.number });
  if (rows.length === 0) return fail("Already marked as sent.");
  await audit(db, {
    action: "invoice.peppolSent",
    userId: user.id,
    entity: "invoice",
    entityId: rows[0].id,
    detail: { number: rows[0].number },
  });
  await refreshInvoice(rows[0].id, rows[0].bookingId);
  return { ok: true, data: undefined, message: `${rows[0].number} marked as sent by Peppol` };
}
