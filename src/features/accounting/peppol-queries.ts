import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { COMPANY, DECLARANT } from "@/domain/company";
import { vatCountry } from "@/domain/listings";
import { peppolProblems, ublXml } from "@/domain/peppol";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import { bookings, contacts, invoiceLines, invoices } from "@/server/db/schema";

/**
 * The Peppol UBL file of an issued sales invoice or credit note, or what stops it (a customer
 * without VAT number or address — the network would refuse the file).
 */
export async function peppolFile(
  id: string,
): Promise<{ xml: string; filename: string } | { problems: string[] }> {
  await requirePermission("app.accounting");
  const [row] = await db
    .select({ inv: invoices, customer: contacts, bookingRef: bookings.ref })
    .from(invoices)
    .innerJoin(contacts, eq(contacts.id, invoices.customerId))
    .leftJoin(bookings, eq(bookings.id, invoices.bookingId))
    .where(eq(invoices.id, id));
  if (!row || row.inv.status !== "issued" || row.inv.kind === "bill")
    return { problems: ["Only an issued invoice or credit note has a Peppol file."] };
  const { inv, customer: c } = row;
  const problems = peppolProblems(c);
  if (problems.length) return { problems };
  const [lines, origin] = await Promise.all([
    db
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.invoiceId, id), isNull(invoiceLines.archivedAt)))
      .orderBy(asc(invoiceLines.position)),
    inv.creditOfId
      ? db
          .select({ number: invoices.number, issueDate: invoices.issueDate })
          .from(invoices)
          .where(eq(invoices.id, inv.creditOfId))
      : Promise.resolve([]),
  ]);
  const number = inv.number ?? "";
  const xml = ublXml({
    credit: inv.kind === "credit",
    number,
    issueDate: inv.issueDate ?? "",
    dueDate: inv.dueDate,
    buyerReference: row.bookingRef ?? number,
    note: inv.reason,
    creditOf: origin[0]?.number
      ? { number: origin[0].number, issueDate: origin[0].issueDate ?? "" }
      : null,
    supplier: {
      name: DECLARANT.name,
      street: DECLARANT.street,
      city: DECLARANT.city,
      zip: DECLARANT.postCode,
      country: "BE",
      vat: DECLARANT.vat,
    },
    customer: {
      name: c.name,
      street: c.street,
      city: c.city,
      zip: c.zip,
      country: vatCountry(c.vat, c.country),
      vat: c.vat,
    },
    iban: COMPANY.iban,
    paymentId: inv.ogm,
    lines: lines.map((l) => ({
      description: l.description,
      qty: l.qty,
      unitCents: l.unitCents,
      vatCode: l.vatCode,
    })),
  });
  return { xml, filename: `${number.replace(/\//g, "-")}.xml` };
}
