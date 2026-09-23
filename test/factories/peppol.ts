import type { UblDoc } from "../../src/domain/peppol";

/** An export invoice to an EU business: a reverse-charge line and a 21% line. */
export const invoice: UblDoc = {
  credit: false,
  number: "INV/2026/00042",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  buyerReference: "SB2609001",
  supplier: {
    name: "ASASLINE S.A.",
    street: "Rue de Douvres 115",
    city: "Bruxelles",
    zip: "1070",
    country: "BE",
    vat: "BE0772649540",
  },
  customer: { name: "Berlin & Co GmbH", city: "Berlin", country: "DE", vat: "DE811907980" },
  iban: "BE41 0689 4162 5810",
  paymentId: "+++090/9337/55493+++",
  lines: [
    { description: "Ocean freight", qty: 1, unitCents: 150_000, vatCode: "RC" },
    { description: "Handling", qty: 2, unitCents: 5_000, vatCode: "S21" },
  ],
};
