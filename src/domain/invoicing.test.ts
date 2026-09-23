import { describe, expect, it } from "vitest";
import {
  billStatus,
  dueDateOf,
  formatInvoiceNumber,
  invoiceSequenceKey,
  invoiceTotals,
  payerProblem,
  remainingQty,
  vatMentions,
} from "./invoicing";
import { approvalProblem, needsApproval, payProblem } from "./accounting";

describe("numbering", () => {
  it("formats the Odoo-shaped number per kind and year", () => {
    expect(formatInvoiceNumber("invoice", "2026-09-23", 1)).toBe("INV/2026/00001");
    expect(formatInvoiceNumber("credit", "2027-01-02", 42)).toBe("CN/2027/00042");
    expect(invoiceSequenceKey("invoice", "2026-12-31")).toBe("INV2026");
    expect(() => formatInvoiceNumber("invoice", "2026-09-23", 0)).toThrow();
  });
});

describe("totals", () => {
  it("adds net, and VAT per rate rounded once", () => {
    const t = invoiceTotals([
      { qty: 1, unitCents: 150000, vatCode: "EX41" },
      { qty: 3, unitCents: 3333, vatCode: "S21" },
      { qty: 1, unitCents: 1, vatCode: "S21" },
    ]);
    expect(t.netCents).toBe(150000 + 9999 + 1);
    // 21% is taken once on the 21% base (100.00 → 21.00), 0% on the exempt base
    expect(t.rates).toEqual([
      { rate: 21, baseCents: 10000, vatCents: 2100 },
      { rate: 0, baseCents: 150000, vatCents: 0 },
    ]);
    expect(t.grossCents).toBe(162100);
  });
  it("refuses an unknown VAT code instead of guessing 0%", () => {
    expect(() => invoiceTotals([{ qty: 1, unitCents: 100, vatCode: "S99" }])).toThrow(
      /Unknown VAT/,
    );
  });
  it("prints the legal mention of each exempt code used, once", () => {
    const m = vatMentions([
      { qty: 1, unitCents: 1, vatCode: "EX41" },
      { qty: 1, unitCents: 1, vatCode: "EX41" },
      { qty: 1, unitCents: 1, vatCode: "S21" },
    ]);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatch(/article 41/);
  });
});

describe("due date", () => {
  it("adds the term's days, or is due at once for a condition", () => {
    expect(dueDateOf("2026-09-23", { rule: "days", days: 30 })).toBe("2026-10-23");
    expect(dueDateOf("2026-09-23", { rule: "docs" })).toBe("2026-09-23");
    expect(dueDateOf("2026-09-23", null)).toBe("2026-09-23");
  });
});

describe("billing", () => {
  it("says how far a booking is invoiced", () => {
    expect(billStatus(0, 0)).toBe("none");
    expect(billStatus(1000, 0)).toBe("not");
    expect(billStatus(1000, 400)).toBe("partly");
    expect(billStatus(1000, 1000)).toBe("done");
    expect(billStatus(1000, 1200)).toBe("over");
  });
  it("counts credits back into what is left to invoice", () => {
    expect(remainingQty(3, [])).toBe(3);
    expect(remainingQty(3, [{ kind: "invoice", qty: 2 }])).toBe(1);
    expect(
      remainingQty(3, [
        { kind: "invoice", qty: 3 },
        { kind: "credit", qty: 1 },
      ]),
    ).toBe(1);
    expect(remainingQty(1, [{ kind: "invoice", qty: 2 }])).toBe(0);
  });
  it("only invoices a party on the booking (legacy 10.3)", () => {
    expect(payerProblem("c1", ["c1", null])).toBeNull();
    expect(payerProblem("c9", ["c1", "c2"])).toMatch(/party on the booking/);
  });
});

describe("supplier bills", () => {
  it("number in their own series", () => {
    expect(formatInvoiceNumber("bill", "2026-09-23", 7)).toBe("BILL/2026/00007");
  });
  it("need four eyes from €5,000", () => {
    expect(needsApproval(499_999)).toBe(false);
    expect(needsApproval(500_000)).toBe(true);
    expect(approvalProblem("u1", "u1")).toMatch(/second person/);
    expect(approvalProblem("u1", "u2")).toBeNull();
    expect(payProblem({ grossCents: 600_000, approvedAt: null })).toMatch(/approve/);
    expect(payProblem({ grossCents: 600_000, approvedAt: new Date() })).toBeNull();
    expect(payProblem({ grossCents: 10_000, approvedAt: null })).toBeNull();
  });
});
