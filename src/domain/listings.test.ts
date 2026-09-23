import { describe, expect, it } from "vitest";
import {
  clientListing,
  clientListingXml,
  csvCell,
  intraListing,
  intraListingXml,
  journalCsv,
  type ListingDoc,
  vatCountry,
} from "./listings";
import { docEntry } from "./ledger";

const doc = (o: Partial<ListingDoc>): ListingDoc => ({
  side: "sale",
  credit: false,
  date: "2026-05-10",
  partnerId: "c1",
  partner: "Acme",
  partnerCountry: "BE",
  partnerVat: "BE0123.456.789",
  lines: [{ qty: 1, unitCents: 100_000, vatCode: "S21" }],
  ...o,
});

const office = {
  vat: "BE0772649540",
  name: "ASASLINE",
  street: "Rue 1",
  postCode: "1070",
  city: "Bruxelles",
  email: "a@b.be",
  phone: "+32",
};

describe("vatCountry", () => {
  it("reads the prefix of the VAT number, else the contact's country", () => {
    expect(vatCountry("NL 123", "BE")).toBe("NL");
    expect(vatCountry("0123456789", "FR")).toBe("FR");
    expect(vatCountry(null, null)).toBe("BE");
  });
});

describe("clientListing", () => {
  it("sums a Belgian customer's year net of credit notes", () => {
    const rows = clientListing(
      [doc({}), doc({ credit: true, lines: [{ qty: 1, unitCents: 20_000, vatCode: "S21" }] })],
      "2026",
    );
    expect(rows).toEqual([
      { partner: "Acme", vat: "0123456789", netCents: 80_000, vatCents: 16_800 },
    ]);
  });

  it("leaves out customers at €250 or less, abroad, without a number, or in another year", () => {
    const rows = clientListing(
      [
        doc({ partnerId: "small", lines: [{ qty: 1, unitCents: 25_000, vatCode: "S21" }] }),
        doc({ partnerId: "fr", partnerVat: "FR123", partnerCountry: "FR" }),
        doc({ partnerId: "none", partnerVat: null }),
        doc({ partnerId: "old", date: "2025-12-31" }),
        doc({ partnerId: "bill", side: "purchase" }),
      ],
      "2026",
    );
    expect(rows).toEqual([]);
  });

  it("writes the listing file with its totals", () => {
    const xml = clientListingXml("2026", clientListing([doc({})], "2026"), office);
    expect(xml).toContain('ClientsNbr="1"');
    expect(xml).toContain('TurnOverSum="1000.00" VATAmountSum="210.00"');
    expect(xml).toContain('<ns2:CompanyVATNumber issuedBy="BE">0123456789</ns2:CompanyVATNumber>');
  });
});

describe("intraListing", () => {
  const eu = doc({
    partnerId: "de",
    partner: "Berlin GmbH",
    partnerVat: "DE 811 907 980",
    partnerCountry: "DE",
    lines: [
      { qty: 1, unitCents: 30_000, vatCode: "RC" },
      { qty: 1, unitCents: 5_000, vatCode: "EX41" },
    ],
  });

  it("lists only the reverse-charge services, per customer, inside the period", () => {
    const rows = intraListing([eu, doc({ date: "2026-09-01" })], {
      from: "2026-04-01",
      to: "2026-06-30",
    });
    expect(rows).toEqual([
      { partner: "Berlin GmbH", country: "DE", vat: "811907980", netCents: 30_000 },
    ]);
  });

  it("writes code S (services) with the customer's country", () => {
    const xml = intraListingXml(
      "2026-Q2",
      intraListing([eu], { from: "2026-04-01", to: "2026-06-30" }),
      office,
    );
    expect(xml).toContain('issuedBy="DE">811907980</ns2:CompanyVATNumber><ns2:Code>S</ns2:Code>');
    expect(xml).toContain("<ns2:Quarter>2</ns2:Quarter>");
  });
});

describe("journalCsv", () => {
  it("quotes a cell holding the separator", () => {
    expect(csvCell('a;"b"')).toBe('"a;""b"""');
  });

  it("writes one row per line with comma decimals and a BOM", () => {
    const e = docEntry({
      id: "i",
      side: "sale",
      credit: false,
      number: "INV/2026/00001",
      date: "2026-05-10",
      partner: "Acme",
      lines: [{ qty: 1, unitCents: 100_000, vatCode: "S21", account: "700000" }],
    });
    const csv = journalCsv([e]);
    expect(csv.startsWith("﻿Date;Journal")).toBe(true);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toBe(
      "2026-05-10;SAL;INV/2026/00001;400000;Customers;Invoice · Acme;Acme;1210,00;",
    );
  });
});
