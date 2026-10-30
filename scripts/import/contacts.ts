/**
 * Legacy contacts → contacts, their child addresses and bank accounts. A contact the new app
 * already holds (same VAT number, else same name — e.g. from the Odoo cut-over) is linked,
 * not duplicated; a contact archived in the legacy office stays archived.
 */
import { and, eq, isNull } from "drizzle-orm";
import { mapLegacyContact } from "../../src/domain/legacy-contacts";
import type { LegacyRecord } from "../../src/domain/legacy-export";
import type { DbOrTx } from "../../src/server/db/client";
import {
  contactAddresses,
  contactBankAccounts,
  contacts,
  legacyLinks,
} from "../../src/server/db/schema";
import { setContactLabels } from "../../src/server/contact-labels";
import { emptyReport, type KindReport } from "./report";

export async function linksOf(tx: DbOrTx, kind: string): Promise<Map<string, string>> {
  const rows = await tx
    .select({ legacyId: legacyLinks.legacyId, recordId: legacyLinks.recordId })
    .from(legacyLinks)
    .where(eq(legacyLinks.kind, kind));
  return new Map(rows.map((r) => [r.legacyId, r.recordId]));
}

async function knownContacts(tx: DbOrTx) {
  const rows = await tx
    .select({ id: contacts.id, name: contacts.name, vat: contacts.vat })
    .from(contacts)
    .where(isNull(contacts.archivedAt));
  const byVat = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const r of rows) {
    if (r.vat) byVat.set(r.vat.replace(/[\s.-]/g, "").toUpperCase(), r.id);
    byName.set(r.name.trim().toLowerCase(), r.id);
  }
  return { byVat, byName };
}

const ARCHIVED = "Archived in the legacy office";

export async function importContacts(
  tx: DbOrTx,
  records: readonly LegacyRecord[],
): Promise<KindReport> {
  const report = emptyReport();
  const links = await linksOf(tx, "contacts");
  const known = await knownContacts(tx);
  for (const rec of records.filter((r) => r.kind === "contacts")) {
    if (links.has(rec.id)) {
      report.already++;
      continue;
    }
    const rows = mapLegacyContact(rec.body);
    if (!rows) {
      report.skipped.push(`contact ${rec.id}: no name`);
      continue;
    }
    for (const w of rows.warnings) report.warnings.push(`${rows.contact.name}: ${w}`);
    const match =
      (rows.contact.vat && known.byVat.get(rows.contact.vat)) ||
      known.byName.get(rows.contact.name.toLowerCase());
    let id = match || "";
    if (id && !rec.archived) {
      for (const b of rows.banks)
        if (!(await hasIban(tx, id, b.iban)))
          await tx.insert(contactBankAccounts).values({ ...b, contactId: id });
      report.matched++;
    } else {
      const archived = rec.archived ? { archivedAt: new Date(), archivedReason: ARCHIVED } : {};
      const { professions, tags: words, ...contact } = rows.contact;
      [{ id }] = await tx
        .insert(contacts)
        .values({ ...contact, ...archived })
        .returning({ id: contacts.id });
      await setContactLabels(tx, id, { professions, tags: words }, null);
      if (rows.addresses.length)
        await tx
          .insert(contactAddresses)
          .values(rows.addresses.map((a) => ({ ...a, contactId: id })));
      if (rows.banks.length)
        await tx
          .insert(contactBankAccounts)
          .values(rows.banks.map((b) => ({ ...b, contactId: id })));
      if (!rec.archived) {
        if (rows.contact.vat) known.byVat.set(rows.contact.vat, id);
        known.byName.set(rows.contact.name.toLowerCase(), id);
      }
      report.added++;
    }
    await tx.insert(legacyLinks).values({ kind: "contacts", legacyId: rec.id, recordId: id });
    links.set(rec.id, id);
  }
  return report;
}

/** Bank accounts of a matched contact are added when the contact does not hold them yet. */
export async function hasIban(tx: DbOrTx, contactId: string, iban: string) {
  const [row] = await tx
    .select({ id: contactBankAccounts.id })
    .from(contactBankAccounts)
    .where(and(eq(contactBankAccounts.contactId, contactId), eq(contactBankAccounts.iban, iban)));
  return !!row;
}
