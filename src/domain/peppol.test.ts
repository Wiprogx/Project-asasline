import { describe, expect, it } from "vitest";
import { invoice } from "../../test/factories/peppol";
import { peppolProblems, ublVat, ublXml } from "./peppol";

describe("ublXml", () => {
  const xml = ublXml(invoice);

  it("follows Peppol BIS Billing 3.0 as an invoice (380)", () => {
    expect(xml).toContain("urn:fdc:peppol.eu:2017:poacc:billing:3.0");
    expect(xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
  });

  it("totals per tax category, with the exemption reason on the reverse charge", () => {
    expect(xml).toContain('<cbc:TaxAmount currencyID="EUR">21.00</cbc:TaxAmount>');
    expect(xml).toContain(
      "<cbc:ID>AE</cbc:ID><cbc:Percent>0</cbc:Percent><cbc:TaxExemptionReason>",
    );
    expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">1621.00</cbc:PayableAmount>');
  });

  it("addresses the parties by their Peppol scheme and escapes names", () => {
    expect(xml).toContain('<cbc:EndpointID schemeID="0208">0772649540</cbc:EndpointID>');
    expect(xml).toContain('<cbc:EndpointID schemeID="9930">DE811907980</cbc:EndpointID>');
    expect(xml).toContain("<cbc:Name>Berlin &amp; Co GmbH</cbc:Name>");
  });

  it("writes a credit note (381) with the invoice it credits and no payment means", () => {
    const cn = ublXml({
      ...invoice,
      credit: true,
      number: "CN/2026/00003",
      creditOf: { number: "INV/2026/00042", issueDate: "2026-09-01" },
    });
    expect(cn).toContain("<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>");
    expect(cn).toContain("<cac:InvoiceDocumentReference><cbc:ID>INV/2026/00042</cbc:ID>");
    expect(cn).toContain("<cac:CreditNoteLine>");
    expect(cn).not.toContain("PaymentMeans");
  });
});

describe("ublVat", () => {
  it("maps tax categories back to our VAT codes", () => {
    expect(ublVat("S", 21)).toBe("S21");
    expect(ublVat("S", 6)).toBe("S6");
    expect(ublVat("AE", 0)).toBe("RC");
    expect(ublVat("E", 0)).toBe("EX41");
    expect(ublVat("Z", 0)).toBe("S0");
  });
});

describe("peppolProblems", () => {
  it("needs the customer's VAT number and address", () => {
    expect(peppolProblems({ name: "X" })).toEqual(["X has no VAT number", "X has no address"]);
    expect(peppolProblems({ name: "X", vat: "BE0123456789", city: "Gent" })).toEqual([]);
  });
});
