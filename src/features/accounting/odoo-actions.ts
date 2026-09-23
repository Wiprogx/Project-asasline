"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ibanOk } from "@/domain/iban";
import { formatCents } from "@/domain/money";
import { openingLines, readBalances, readContacts, readOpenDocs, seriesOf } from "@/domain/odoo";
import { ogmMake } from "@/domain/ogm";
import { type ActionResult, fail } from "@/lib/action-result";
import { audit } from "@/server/audit";
import { requirePermission } from "@/server/auth/dal";
import { invalidateTags, tags } from "@/server/cache/cache";
import { db } from "@/server/db/client";
import {
  contactBankAccounts,
  contacts,
  invoiceLines,
  invoices,
  openingBalances,
  sequences,
} from "@/server/db/schema";
import { assertOpen } from "./books-store";
import { guarded, Refused } from "./invoice-store";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** The uploaded CSV, read as UTF-8 or (older Odoo exports) Latin-1. */
async function csvOf(fd: FormData): Promise<string | null> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10_000_000) return null;
  const buf = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("latin1").decode(buf);
  }
}

const vatDigitsSql = sql`regexp_replace(upper(coalesce(${contacts.vat}, '')), '^[A-Z]{2}|[^0-9]', '', 'g')`;

/** Odoo's contacts: new ones added, known ones (same VAT number or name) completed, never overwritten. */
export async function importOdooContacts(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const text = await csvOf(fd);
  if (!text) return fail("Choose Odoo's contacts export (CSV, up to 10 MB).");
  const read = readContacts(text);
  if ("error" in read) return fail(read.error);
  const counts = await db.transaction(async (tx) => {
    let added = 0;
    let completed = 0;
    for (const c of read.items) {
      const digits = (c.vat ?? "").replace(/^[A-Z]{2}/, "");
      const [known] = await tx
        .select()
        .from(contacts)
        .where(
          and(
            isNull(contacts.archivedAt),
            digits
              ? sql`(${vatDigitsSql} = ${digits} or lower(${contacts.name}) = lower(${c.name}))`
              : sql`lower(${contacts.name}) = lower(${c.name})`,
          ),
        )
        .limit(1);
      let id = known?.id;
      if (known) {
        const fill = Object.fromEntries(
          (["vat", "street", "zip", "city", "country", "email", "phone"] as const)
            .filter((k) => !known[k] && c[k])
            .map((k) => [k, c[k]]),
        );
        if (Object.keys(fill).length) {
          await tx
            .update(contacts)
            .set({ ...fill, updatedBy: user.id, updatedAt: new Date() })
            .where(eq(contacts.id, known.id));
          completed++;
        }
      } else {
        const { name, vat, street, zip, city, country, email, phone } = c;
        [{ id }] = await tx
          .insert(contacts)
          .values({
            ...{ name, vat, street, zip, city, country, email, phone },
            note: "Imported from Odoo",
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning({ id: contacts.id });
        added++;
      }
      if (id && c.iban && ibanOk(c.iban)) {
        const [has] = await tx
          .select({ id: contactBankAccounts.id })
          .from(contactBankAccounts)
          .where(
            and(
              eq(contactBankAccounts.contactId, id),
              eq(contactBankAccounts.iban, c.iban),
              isNull(contactBankAccounts.archivedAt),
            ),
          );
        if (!has)
          await tx.insert(contactBankAccounts).values({
            contactId: id,
            iban: c.iban,
            label: "From Odoo",
            createdBy: user.id,
          });
      }
    }
    await audit(tx, {
      action: "odoo.contacts",
      userId: user.id,
      entity: "odoo",
      entityId: "contacts",
      detail: { added, completed },
    });
    return { added, completed };
  });
  await invalidateTags(tags.contacts);
  revalidatePath("/contacts");
  return {
    ok: true,
    data: undefined,
    message: `${counts.added} contacts added, ${counts.completed} completed from Odoo`,
  };
}

/**
 * Odoo's invoices (side "sale") or bills ("purchase") still open on the cut-over day, each as
 * an opening document of its open part against 499000, under Odoo's own number. Our series then
 * continue after the highest Odoo number, so no number is ever given twice.
 */
export async function importOdooDocs(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const side = fd.get("side") === "purchase" ? "purchase" : "sale";
  const cutoff = day.safeParse(fd.get("cutoff"));
  if (!cutoff.success) return fail("The cut-over day, as a date.");
  const text = await csvOf(fd);
  if (!text) return fail("Choose Odoo's export of open documents (CSV).");
  const read = readOpenDocs(text);
  if ("error" in read) return fail(read.error);
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      await assertOpen(tx, cutoff.data);
      const late = read.items.find((d) => d.date && d.date > cutoff.data);
      if (late)
        throw new Refused(
          `${late.number} is dated after the cut-over day: enter it as a normal document.`,
        );
      const missing = new Set<string>();
      let added = 0;
      let openCents = 0;
      for (const d of read.items) {
        if (side === "purchase" && d.credit) continue; // a supplier's credit is recorded by hand
        const [partner] = await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            and(isNull(contacts.archivedAt), sql`lower(${contacts.name}) = lower(${d.partner})`),
          )
          .limit(1);
        if (!partner) {
          missing.add(d.partner);
          continue;
        }
        const [here] = await tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.number, d.number));
        if (here) continue;
        const kind = side === "purchase" ? "bill" : d.credit ? "credit" : "invoice";
        const [doc] = await tx
          .insert(invoices)
          .values({
            kind,
            status: "issued",
            opening: true,
            number: d.number,
            customerId: partner.id,
            supplierRef: kind === "bill" ? d.number : null,
            issueDate: d.date || cutoff.data,
            dueDate: d.dueDate,
            ogm: kind === "invoice" ? ogmMake(d.number) : null,
            netCents: d.openCents,
            vatCents: 0,
            grossCents: d.openCents,
            // Approved in Odoo already: the four eyes were there.
            approvedBy: kind === "bill" ? user.id : null,
            approvedAt: kind === "bill" ? new Date() : null,
            note: `Open in Odoo on ${cutoff.data}: ${formatCents(d.openCents)} of ${formatCents(d.totalCents)}`,
            createdBy: user.id,
            updatedBy: user.id,
          })
          .returning({ id: invoices.id });
        await tx.insert(invoiceLines).values({
          invoiceId: doc.id,
          description: `${d.credit ? "Credit note" : side === "sale" ? "Invoice" : "Bill"} ${d.number} — open on ${cutoff.data} (Odoo)`,
          qty: 1,
          unitCents: d.openCents,
          vatCode: "S0",
          account: "499000",
          createdBy: user.id,
        });
        const series = seriesOf(d.number);
        if (series)
          await tx
            .insert(sequences)
            .values({ key: series.key, value: series.n })
            .onConflictDoUpdate({
              target: sequences.key,
              set: { value: sql`greatest(${sequences.value}, ${series.n})` },
            });
        added++;
        openCents += (d.credit ? -1 : 1) * d.openCents;
      }
      await audit(tx, {
        action: "odoo.open-documents",
        userId: user.id,
        entity: "odoo",
        entityId: side,
        detail: { added, openCents, missing: [...missing] },
      });
      return { added, openCents, missing: [...missing] };
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting", "layout");
  const { added, openCents, missing } = r.value;
  return {
    ok: true,
    data: undefined,
    message: `${added} open ${side === "sale" ? "invoices" : "bills"} brought over · ${formatCents(openCents)}${
      missing.length
        ? ` — no contact for ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}: import the contacts first`
        : ""
    }`,
  };
}

/** Odoo's trial balance on the cut-over day, as the opening entry. It must balance. */
export async function importOdooBalances(_p: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requirePermission("accounting.closePeriods");
  const cutoff = day.safeParse(fd.get("cutoff"));
  if (!cutoff.success) return fail("The cut-over day, as a date.");
  const text = await csvOf(fd);
  if (!text) return fail("Choose Odoo's trial balance export (CSV).");
  const read = readBalances(text);
  if ("error" in read) return fail(read.error);
  const { lines, problem } = openingLines(read.items);
  if (problem) return fail(problem);
  const r = await guarded(() =>
    db.transaction(async (tx) => {
      await assertOpen(tx, cutoff.data);
      const [live] = await tx
        .select({ onDate: openingBalances.onDate })
        .from(openingBalances)
        .where(isNull(openingBalances.archivedAt));
      if (live) throw new Refused(`The opening balance of ${live.onDate} is already booked.`);
      await tx.insert(openingBalances).values({ onDate: cutoff.data, lines, createdBy: user.id });
      await audit(tx, {
        action: "odoo.opening-balance",
        userId: user.id,
        entity: "odoo",
        entityId: cutoff.data,
        detail: { accounts: lines.length },
      });
    }),
  );
  if (!r.ok) return r;
  revalidatePath("/accounting", "layout");
  return {
    ok: true,
    data: undefined,
    message: `Opening balance booked on ${cutoff.data} · ${lines.length} accounts`,
  };
}
