import { describe, expect, it } from "vitest";
import {
  accountLedger,
  ageBucket,
  agedBalance,
  balanceSheet,
  docEntry,
  journal,
  type LedgerDoc,
  type LedgerPayment,
  paymentEntries,
  profitAndLoss,
  searchEntries,
  trialBalance,
} from "./ledger";

const sale: LedgerDoc = {
  id: "i1",
  side: "sale",
  credit: false,
  number: "INV/2026/00001",
  date: "2026-03-10",
  partner: "Acme",
  lines: [
    { qty: 1, unitCents: 100_000, vatCode: "S21", account: "700000" },
    { qty: 2, unitCents: 5_000, vatCode: "EX41", account: "700000" },
  ],
};

const bill: LedgerDoc = {
  id: "b1",
  side: "purchase",
  credit: false,
  number: "BILL/2026/00001",
  date: "2026-03-12",
  partner: "Haulier",
  lines: [{ qty: 1, unitCents: 40_000, vatCode: "S21", account: "604000" }],
};

const pay: LedgerPayment = {
  id: "p1",
  direction: "in",
  date: "2026-04-01",
  amountCents: 131_000,
  diffCents: 0,
  diffAccount: null,
  partner: "Acme",
  reference: null,
  invoiceNumber: "INV/2026/00001",
  reversedOn: null,
};

const at = (e: { lines: { account: string; cents: number }[] }, account: string) =>
  e.lines.filter((l) => l.account === account).reduce((s, l) => s + l.cents, 0);

describe("docEntry", () => {
  it("debits the customer with the gross and credits sales and VAT", () => {
    const e = docEntry(sale);
    expect(at(e, "400000")).toBe(131_000);
    expect(at(e, "700000")).toBe(-110_000);
    expect(at(e, "451000")).toBe(-21_000);
  });

  it("credits the supplier and debits the cost and recoverable VAT on a bill", () => {
    const e = docEntry(bill);
    expect(e.journal).toBe("PUR");
    expect(at(e, "440000")).toBe(-48_400);
    expect(at(e, "604000")).toBe(40_000);
    expect(at(e, "411000")).toBe(8_400);
  });

  it("mirrors the invoice on a credit note", () => {
    const e = docEntry({ ...sale, credit: true, number: "CN/2026/00001" });
    expect(at(e, "400000")).toBe(-131_000);
    expect(at(e, "700000")).toBe(110_000);
  });

  it("books both sides of the reverse charge on an EU service bought", () => {
    const e = docEntry({
      ...bill,
      lines: [{ qty: 1, unitCents: 10_000, vatCode: "RC", account: "619000" }],
    });
    expect(at(e, "440000")).toBe(-10_000);
    expect(e.lines.filter((l) => l.account === "411000").map((l) => l.cents)).toEqual([2_100]);
    expect(e.lines.filter((l) => l.account === "451000").map((l) => l.cents)).toEqual([-2_100]);
  });

  it("refuses a line with an unknown VAT code rather than guess", () => {
    expect(() =>
      docEntry({ ...sale, lines: [{ qty: 1, unitCents: 1, vatCode: "X", account: "700000" }] }),
    ).toThrow(/Unknown VAT code/);
  });
});

describe("paymentEntries", () => {
  it("debits the bank and credits the customer", () => {
    const [e] = paymentEntries(pay);
    expect(at(e, "550000")).toBe(131_000);
    expect(at(e, "400000")).toBe(-131_000);
  });

  it("settles the customer in full when a shortfall is written off", () => {
    const [e] = paymentEntries({
      ...pay,
      amountCents: 130_950,
      diffCents: 50,
      diffAccount: "657000",
    });
    expect(at(e, "550000")).toBe(130_950);
    expect(at(e, "657000")).toBe(50);
    expect(at(e, "400000")).toBe(-131_000);
  });

  it("credits the bank and debits the supplier on money going out", () => {
    const [e] = paymentEntries({ ...pay, direction: "out", amountCents: 48_400 });
    expect(at(e, "550000")).toBe(-48_400);
    expect(at(e, "440000")).toBe(48_400);
  });

  it("keeps the payment and adds an opposite entry on the day it is reversed", () => {
    const es = paymentEntries({ ...pay, reversedOn: "2026-04-05" });
    expect(es.map((e) => e.date)).toEqual(["2026-04-01", "2026-04-05"]);
    expect(at(es[1], "550000")).toBe(-131_000);
  });
});

describe("reports", () => {
  const entries = journal([sale, bill], [pay]);
  const tb = trialBalance(entries, "2026-04-01", "2026-04-30");

  it("sorts the journal by date", () => {
    expect(entries.map((e) => e.journal)).toEqual(["SAL", "PUR", "BNK"]);
  });

  it("splits a balance into before the period and movements inside it", () => {
    const customers = tb.find((a) => a.account === "400000")!;
    expect(customers).toMatchObject({ openCents: 131_000, creditCents: 131_000, closeCents: 0 });
  });

  it("balances: total debits equal total credits", () => {
    const all = trialBalance(entries, "2026-01-01", "2026-12-31");
    const d = all.reduce((s, a) => s + a.debitCents, 0);
    const c = all.reduce((s, a) => s + a.creditCents, 0);
    expect(d).toBe(c);
  });

  it("computes the result from revenue less costs inside the period", () => {
    const pl = profitAndLoss(trialBalance(entries, "2026-03-01", "2026-03-31"));
    expect(pl).toMatchObject({ revenueCents: 110_000, costCents: 40_000, resultCents: 70_000 });
    expect(profitAndLoss(tb).resultCents).toBe(0);
  });

  it("keeps assets equal to liabilities plus the result", () => {
    const bs = balanceSheet(trialBalance(entries, "2026-01-01", "2026-12-31"));
    expect(bs.resultCents).toBe(70_000);
    expect(bs.assetCents).toBe(bs.liabilityCents);
  });

  it("runs an account's balance from its opening", () => {
    const l = accountLedger(entries, "400000", "2026-04-01", "2026-04-30");
    expect(l.openCents).toBe(131_000);
    expect(l.rows.map((r) => r.balanceCents)).toEqual([0]);
    expect(l.closeCents).toBe(0);
  });
});

describe("searchEntries", () => {
  const entries = journal([sale, bill], [pay]);

  it("finds entries by reference, label or partner, every word", () => {
    expect(searchEntries(entries, "bill/2026").map((e) => e.journal)).toEqual(["PUR"]);
    expect(searchEntries(entries, "acme received")).toHaveLength(1);
    expect(searchEntries(entries, "  ")).toHaveLength(3);
  });
});

describe("aged balance", () => {
  it("puts an invoice not yet due in its own bucket", () => {
    expect(ageBucket("2026-05-01", "2026-05-01")).toBe("Not due");
    expect(ageBucket(null, "2026-05-01")).toBe("Not due");
  });

  it("counts the days past due into 30-day buckets", () => {
    expect(ageBucket("2026-04-01", "2026-05-01")).toBe("1–30");
    expect(ageBucket("2026-03-31", "2026-05-01")).toBe("31–60");
    expect(ageBucket("2026-01-01", "2026-05-01")).toBe("90+");
  });

  it("totals per partner, largest first", () => {
    const rows = agedBalance(
      [
        { partner: "A", dueDate: "2026-04-01", openCents: 100 },
        { partner: "B", dueDate: null, openCents: 500 },
        { partner: "A", dueDate: "2026-06-01", openCents: 50 },
      ],
      "2026-05-01",
    );
    expect(rows.map((r) => [r.partner, r.total])).toEqual([
      ["B", 500],
      ["A", 150],
    ]);
    expect(rows[1].buckets["1–30"]).toBe(100);
  });
});
