import { describe, expect, it } from "vitest";
import { csvCents, dedupKey, parseBankCsv, parseCoda, parseStatement } from "./bank";
import { certainMatch, type OpenInvoice, proposals } from "./matching";
import { ogmMake } from "./ogm";
import { openCents, payState, settlement } from "./payments";

describe("open amount and state", () => {
  const base = {
    grossCents: 100000,
    settledCents: 0,
    creditedCents: 0,
    dueDate: "2026-10-01",
    today: "2026-09-23",
  };
  it("follows the money", () => {
    expect(payState(base)).toBe("open");
    expect(payState({ ...base, settledCents: 40000 })).toBe("partly");
    expect(payState({ ...base, settledCents: 100000 })).toBe("paid");
    expect(payState({ ...base, today: "2026-10-02" })).toBe("overdue");
    expect(payState({ ...base, creditedCents: 100000 })).toBe("credited");
  });
  it("never goes below zero open", () => {
    expect(openCents(100, 80, 50)).toBe(0);
    expect(openCents(100, 30, 0)).toBe(70);
  });
});

describe("settlement", () => {
  it("never settles more than is open", () => {
    expect(settlement(12000, 10000, null).problem).toMatch(/Only 100.00 is open/);
    expect(settlement(0, 10000, null).problem).toMatch(/above zero/);
  });
  it("leaves a shortfall open, unless a write-off account takes it", () => {
    expect(settlement(9950, 10000, null)).toEqual({ allocated: 9950, diffCents: 0, problem: null });
    expect(settlement(9950, 10000, "657000")).toEqual({
      allocated: 9950,
      diffCents: 50,
      problem: null,
    });
  });
});

/** A CODA record: 128 characters with fields at their 1-based Febelfin positions. */
function rec(fields: [number, string][]) {
  const a = Array<string>(128).fill(" ");
  for (const [pos, v] of fields) for (let k = 0; k < v.length; k++) a[pos - 1 + k] = v[k];
  return a.join("");
}

describe("CODA", () => {
  const ogm = ogmMake("INV/2026/00017"); // +++100/0000/017xx+++
  const d = ogm.replace(/\D/g, "");
  const file = [
    rec([[1, "0000023092672505"]]),
    rec([
      [1, "1"],
      [6, "BE41068941625810 EUR"],
    ]),
    // A structured payment of 1,250.00 received on 23/09/26.
    rec([
      [1, "21"],
      [3, "0001"],
      [7, "0000"],
      [11, "REF1"],
      [32, "0"],
      [33, "000000001250000"],
      [48, "230926"],
      [62, "1"],
      [63, `101${d}`],
      [116, "230926"],
    ]),
    // A free-text payment of 99.50, with its counterparty on record 23.
    rec([
      [1, "21"],
      [3, "0002"],
      [7, "0000"],
      [32, "0"],
      [33, "000000000099500"],
      [48, "230926"],
      [62, "0"],
      [63, "Invoice INV/2026/00018"],
      [116, "240926"],
    ]),
    rec([
      [1, "22"],
      [11, " thank you"],
    ]),
    rec([
      [1, "23"],
      [11, "BE71096123456769"],
      [48, "OS TEXTILE SPRL"],
    ]),
    // The detail of a grouped movement: not counted twice.
    rec([
      [1, "21"],
      [3, "0003"],
      [7, "0001"],
      [32, "0"],
      [33, "000000000500000"],
    ]),
    // A debit of 12.34.
    rec([
      [1, "21"],
      [3, "0004"],
      [7, "0000"],
      [32, "1"],
      [33, "000000000012340"],
      [48, "250926"],
      [116, "250926"],
    ]),
  ].join("\n");

  it("reads movements, amounts in cents, signs, dates and the structured reference", () => {
    const s = parseCoda(file)!;
    expect(s.account).toBe("BE41068941625810");
    expect(s.moves).toHaveLength(3);
    expect(s.moves[0]).toMatchObject({ amountCents: 125000, date: "2026-09-23", ogm, comm: "" });
    expect(s.moves[1]).toMatchObject({
      amountCents: 9950,
      date: "2026-09-24",
      iban: "BE71096123456769",
      name: "OS TEXTILE SPRL",
    });
    expect(s.moves[1].comm).toBe("Invoice INV/2026/00018 thank you");
    expect(s.moves[2].amountCents).toBe(-1234);
  });
  it("is chosen for a CODA file and refuses what is not one", () => {
    expect(parseStatement(file)?.source).toBe("CODA");
    expect(parseCoda("hello")).toBeNull();
  });
});

describe("bank CSV", () => {
  it("reads Dutch headers, semicolons and decimal commas, and lifts the OGM", () => {
    const csv = [
      "Rekening;Boekingsdatum;Bedrag;Naam tegenpartij;Rekening tegenpartij;Mededeling",
      'BE41068941625810;23/09/2026;"1.250,00";Os Textile;BE71 0961 2345 6769;+++100/0000/01776+++',
      "BE41068941625810;24/09/2026;-12,34;Belfius;;Frais",
    ].join("\n");
    const s = parseBankCsv(csv)!;
    expect(s.moves).toEqual([
      {
        date: "2026-09-23",
        amountCents: 125000,
        name: "Os Textile",
        iban: "BE71096123456769",
        comm: "",
        ogm: "+++100/0000/01776+++",
        ref: "",
      },
      {
        date: "2026-09-24",
        amountCents: -1234,
        name: "Belfius",
        iban: "",
        comm: "Frais",
        ogm: "",
        ref: "",
      },
    ]);
  });
  it("reads amounts in either convention and refuses the rest", () => {
    expect(csvCents("1.234,56")).toBe(123456);
    expect(csvCents("1,234.56")).toBe(123456);
    expect(csvCents("-12,5")).toBe(-1250);
    expect(csvCents("abc")).toBeNull();
  });
  it("keys a movement so an overlapping import skips it", () => {
    const m = {
      date: "2026-09-23",
      amountCents: 100,
      name: "",
      iban: "",
      comm: "x",
      ogm: "",
      ref: "",
    };
    expect(dedupKey("BE41", m, 0)).toBe(dedupKey("BE41", { ...m }, 0));
    expect(dedupKey("BE41", m, 0)).not.toBe(dedupKey("BE41", { ...m, amountCents: 101 }, 0));
  });
});

describe("matching", () => {
  const open: OpenInvoice[] = [
    {
      id: "a",
      number: "INV/2026/00017",
      ogm: ogmMake("INV/2026/00017"),
      customerId: "c1",
      openCents: 125000,
    },
    {
      id: "b",
      number: "INV/2026/00018",
      ogm: ogmMake("INV/2026/00018"),
      customerId: "c2",
      openCents: 9950,
    },
    {
      id: "c",
      number: "INV/2026/00019",
      ogm: ogmMake("INV/2026/00019"),
      customerId: "c2",
      openCents: 30000,
    },
  ];
  const line = (
    o: Partial<{ amountCents: number; comm: string; ogm: string; name: string; iban: string }>,
  ) => ({
    amountCents: 125000,
    comm: "",
    ogm: "",
    name: "",
    iban: "",
    ...o,
  });
  const noIban = () => null;

  it("is certain on the structured communication", () => {
    const p = proposals(line({ ogm: open[0].ogm! }), open, noIban);
    expect(p[0]).toMatchObject({ invoiceId: "a", confidence: 3 });
  });
  it("is certain on the invoice number in the text", () => {
    expect(
      proposals(line({ amountCents: 9950, comm: "pay INV/2026/00018 ok" }), open, noIban)[0],
    ).toMatchObject({ invoiceId: "b", confidence: 3 });
  });
  it("is certain on a known IBAN with exactly the open amount", () => {
    const p = proposals(line({ amountCents: 30000, iban: "BE71" }), open, (i) =>
      i === "BE71" ? "c2" : null,
    );
    expect(p[0]).toMatchObject({ invoiceId: "c", confidence: 3 });
  });
  it("only suggests when the amount alone matches", () => {
    expect(proposals(line({ amountCents: 9950 }), open, noIban)[0]).toMatchObject({
      invoiceId: "b",
      confidence: 1,
    });
  });
  it("proposes nothing for money going out", () => {
    expect(proposals(line({ amountCents: -500 }), open, noIban)).toEqual([]);
  });
  it("never auto-applies more than is open", () => {
    const over = line({ amountCents: 200000, ogm: open[0].ogm! });
    expect(certainMatch(over.amountCents, proposals(over, open, noIban), open)).toBeNull();
    const exact = line({ ogm: open[0].ogm! });
    expect(certainMatch(exact.amountCents, proposals(exact, open, noIban), open)?.invoiceId).toBe(
      "a",
    );
  });
});
