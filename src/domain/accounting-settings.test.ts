import { describe, expect, it } from "vitest";
import {
  DEFAULT_BOOKS,
  DEFAULT_TERMS,
  parsePaymentTermLines,
  paymentTermLines,
  sequenceLabel,
  parallelRun,
} from "./accounting-settings";

describe("the accounting settings", () => {
  it("default to the legacy books: approval from 5,000, a quarterly VAT return, nothing closed", () => {
    expect(DEFAULT_BOOKS).toEqual({
      closedThrough: null,
      approveOverCents: 500_000,
      vatPeriod: "quarterly",
      parallelUntil: null,
    });
  });

  it("round-trip the payment terms through the Settings lines and refuse a bad rule or days", () => {
    const { terms, problems } = parsePaymentTermLines(paymentTermLines(DEFAULT_TERMS));
    expect(problems).toEqual([]);
    expect(terms).toEqual(DEFAULT_TERMS);
    expect(parsePaymentTermLines("d30 | 30 days | sometime").problems[0]).toMatch(/rule/);
    expect(parsePaymentTermLines("d30 | 30 days | days | x").problems[0]).toMatch(/days/);
    expect(parsePaymentTermLines("D30 | 30 days").problems[0]).toMatch(/id/);
    expect(parsePaymentTermLines("dap | Documents | docs").terms[0]).toEqual({
      id: "dap",
      name: "Documents",
      rule: "docs",
    });
  });

  it("name a counter the way the office reads it", () => {
    expect(sequenceLabel("QT2610")).toBe("Quotations · 2026-10");
    expect(sequenceLabel("SB2611")).toBe("Bookings · 2026-11");
    expect(sequenceLabel("INV:2026")).toBe("Invoices · 2026");
    expect(sequenceLabel("CN:2026")).toBe("Credit notes · 2026");
    expect(sequenceLabel("odd")).toBe("odd");
  });
});

describe("parallelRun", () => {
  it("runs alongside Odoo up to and including the day, and not without one", () => {
    expect(parallelRun({ parallelUntil: "2026-12-31" }, "2026-12-31")).toBe(true);
    expect(parallelRun({ parallelUntil: "2026-12-31" }, "2027-01-01")).toBe(false);
    expect(parallelRun({ parallelUntil: null }, "2026-10-09")).toBe(false);
  });
});
