import { describe, expect, it } from "vitest";
import { openingLines, readBalances, readContacts, readOpenDocs, seriesOf } from "./odoo";

describe("readContacts", () => {
  it("reads Odoo's columns in any of its languages, the country from the VAT number", () => {
    const r = readContacts(
      [
        "Nom complet;Numéro de TVA;Rue;Code postal;Ville;Pays;Courriel;Compte bancaire",
        'Acme SA;BE 0123.456.749;"Rue X 1";1000;Bruxelles;;info@acme.be;BE68 5390 0754 7034',
        ";;;;;;;",
      ].join("\n"),
    );
    expect(r).toEqual({
      items: [
        {
          name: "Acme SA",
          vat: "BE0123456749",
          street: "Rue X 1",
          zip: "1000",
          city: "Bruxelles",
          country: "BE",
          email: "info@acme.be",
          phone: null,
          iban: "BE68539007547034",
        },
      ],
    });
  });

  it("says when the file is not a contacts export", () => {
    expect(readContacts("Code,Balance\n400000,12")).toEqual({
      error: "No «Name» column — this is not a contacts export.",
    });
  });
});

describe("readOpenDocs", () => {
  const csv = [
    "Number,Partner,Invoice Date,Due Date,Total,Amount Due,Status,Payment Status",
    'INV/2026/00311,Acme SA,15/09/2026,15/10/2026,"1.210,00","1.000,00",Posted,Partial',
    "INV/2026/00312,Acme SA,16/09/2026,,500.00,500.00,Draft,",
    "INV/2026/00313,Acme SA,16/09/2026,,500.00,0.00,Posted,Paid",
    "RINV/2026/00004,Acme SA,17/09/2026,,100.00,100.00,Posted,Not Paid",
  ].join("\n");

  it("keeps only what is posted and still open, with the open part", () => {
    const r = readOpenDocs(csv);
    expect("items" in r && r.items).toEqual([
      {
        number: "INV/2026/00311",
        date: "2026-09-15",
        dueDate: "2026-10-15",
        partner: "Acme SA",
        totalCents: 121_000,
        openCents: 100_000,
        credit: false,
      },
      {
        number: "RINV/2026/00004",
        date: "2026-09-17",
        dueDate: null,
        partner: "Acme SA",
        totalCents: 10_000,
        openCents: 10_000,
        credit: true,
      },
    ]);
  });
});

describe("the opening balance", () => {
  const tb = readBalances(
    [
      "Account,Name,Debit,Credit",
      '550000 Bank,Belfius,"12.000,00",0',
      '400000 Customers,,"5.000,00",0',
      '440000 Suppliers,,0,"2.000,00"',
      '100000 Capital,,0,"10.000,00"',
      '700000 Sales,,0,"20.000,00"',
      '604000 Costs,,"15.000,00",0',
      "Total,,,",
    ].join("\n"),
  );

  it("reads each account's balance from debit and credit", () => {
    expect("items" in tb && tb.items.map((b) => [b.account, b.cents])).toEqual([
      ["550000", 1_200_000],
      ["400000", 500_000],
      ["440000", -200_000],
      ["100000", -1_000_000],
      ["700000", -2_000_000],
      ["604000", 1_500_000],
    ]);
  });

  it("sends customers and suppliers to 499000 and the result to 140000, balanced", () => {
    const o = openingLines("items" in tb ? tb.items : []);
    expect(o.problem).toBeNull();
    expect(o.lines).toEqual([
      { account: "100000", cents: -1_000_000 },
      { account: "140000", cents: -500_000 },
      { account: "499000", cents: 300_000 },
      { account: "550000", cents: 1_200_000 },
    ]);
  });

  it("refuses a trial balance that does not balance", () => {
    expect(openingLines([{ account: "550000", name: "Bank", cents: 100 }]).problem).toMatch(
      /off by 100 cents/,
    );
  });
});

describe("seriesOf", () => {
  it("reads an Odoo number in our shape to continue its series", () => {
    expect(seriesOf("INV/2026/00311")).toEqual({ key: "INV2026", n: 311 });
    expect(seriesOf("F2026-311")).toBeNull();
  });
});
