import { describe, expect, it } from "vitest";
import { mapLegacyInvoice } from "./legacy-invoices";

describe("mapLegacyInvoice", () => {
  it("keeps a sales invoice's number; paid or overdue is simply issued", () => {
    const r = mapLegacyInvoice({
      type: "client",
      st: "paid",
      num: "INV/2026/00041",
      date: "2026-09-02",
      client: "ANA BVBA",
      clientId: 7,
      bookingId: 12,
      termId: "d30",
      ogm: "+++123/4567/89012+++",
      lines: [
        { desc: "Ocean freight", qty: 1, price: 4250, vat: "EX41", acct: "700000", itemId: 1 },
        { desc: "Admin", qty: 2, price: 25.5, vat: "S21", acct: "700300" },
      ],
    });
    if (!r || "skip" in r) throw new Error("skipped");
    expect(r.doc).toMatchObject({
      kind: "invoice",
      status: "issued",
      number: "INV/2026/00041",
      supplierRef: null,
      issueDate: "2026-09-02",
      currency: "EUR",
      fxBp: 10_000,
    });
    expect(r.bookingLegacyId).toBe("12");
    expect(r.lines).toEqual([
      expect.objectContaining({ qty: 1, unitCents: 425000, vatCode: "EX41", legacyItemId: "1" }),
      expect.objectContaining({ qty: 2, unitCents: 2550, account: "700300", legacyItemId: null }),
    ]);
  });

  it("reads a supplier bill: the supplier's number as its reference, its rate", () => {
    const r = mapLegacyInvoice({
      type: "supplier",
      kind: "purchase",
      st: "pending",
      num: "F-2026-118",
      cur: "USD",
      fx: 0.92,
      lines: [{ desc: "Trucking", qty: 1, price: 300, vat: "S21" }],
    });
    if (!r || "skip" in r) throw new Error("skipped");
    expect(r.doc).toMatchObject({
      kind: "bill",
      number: null,
      supplierRef: "F-2026-118",
      fxBp: 9200,
    });
  });

  it("links a credit note to its invoice and its lines to theirs", () => {
    const r = mapLegacyInvoice({
      type: "client",
      kind: "credit",
      st: "credited",
      num: "CN/2026/00003",
      creditOf: 41,
      reason: "Weighing not done",
      lines: [{ desc: "Certiweight", qty: 1, price: 60, vat: "EX41", srcIx: 2 }],
    });
    if (!r || "skip" in r) throw new Error("skipped");
    expect(r.doc).toMatchObject({ kind: "credit", status: "issued", reason: "Weighing not done" });
    expect(r.creditOfLegacyId).toBe("41");
    expect(r.lines[0].creditOfPosition).toBe(2);
  });

  it("folds a part-unit quantity into the price, and says so", () => {
    const r = mapLegacyInvoice({
      type: "client",
      st: "draft",
      lines: [{ desc: "Waiting time", qty: 1.5, price: 45, vat: "XX" }],
    });
    if (!r || "skip" in r) throw new Error("skipped");
    expect(r.lines[0]).toMatchObject({
      description: "Waiting time (1.5 × 45.00)",
      qty: 1,
      unitCents: 6750,
      vatCode: "S21",
    });
    expect(r.warnings).toHaveLength(2);
  });

  it("skips what has no place: a supplier credit note, an issued document without a number", () => {
    expect(mapLegacyInvoice({ type: "supplier", kind: "credit" })).toHaveProperty("skip");
    expect(mapLegacyInvoice({ type: "client", st: "pending" })).toHaveProperty("skip");
  });
});
