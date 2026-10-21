import { describe, expect, it } from "vitest";
import { mapLegacyBankLine, mapLegacyPayment } from "./legacy-payments";

describe("mapLegacyPayment", () => {
  it("keeps the money and each invoice's part", () => {
    const r = mapLegacyPayment({
      ref: "PAY-2610-004",
      dir: "in",
      amount: 1200,
      date: "2026-10-03",
      bankId: "kbc",
      contactId: 7,
      contact: "ANA BVBA",
      allocs: [
        { inv: 41, amount: 1000 },
        { inv: 42, amount: 200 },
      ],
      st: "posted",
    });
    if ("skip" in r) throw new Error("skipped");
    expect(r.payment).toMatchObject({
      direction: "in",
      amountCents: 120000,
      method: "bank",
      reference: "PAY-2610-004",
      diffCents: 0,
      diffAccount: null,
      chargeAccount: null,
      status: "posted",
    });
    expect(r.allocs).toEqual([
      { legacyInvoiceId: "41", amountCents: 100000 },
      { legacyInvoiceId: "42", amountCents: 20000 },
    ]);
  });

  it("writes off what the parts exceed the money by, to the difference's account", () => {
    const r = mapLegacyPayment({
      amount: 995,
      date: "2026-10-03",
      contactId: 7,
      allocs: [{ inv: 41, amount: 1000 }],
      diffs: [{ acct: "657000", amt: -5 }],
    });
    if ("skip" in r) throw new Error("skipped");
    expect(r.payment).toMatchObject({ amountCents: 99500, diffCents: 500, diffAccount: "657000" });
  });

  it("books a payment with nobody straight to its account, in cash when it was cash", () => {
    const r = mapLegacyPayment({
      dir: "out",
      amount: 12.5,
      date: "2026-10-01",
      bankId: "cash",
      memo: "Quarterly fee",
      diffs: [{ acct: "657000", amt: 12.5 }],
    });
    if ("skip" in r) throw new Error("skipped");
    expect(r.payment).toMatchObject({
      direction: "out",
      method: "cash",
      reference: "Quarterly fee",
      chargeAccount: "657000",
    });
  });

  it("reads a reversal, and needs a date", () => {
    const r = mapLegacyPayment({ amount: 1, date: "2026-10-01", st: "reversed", contactId: 1 });
    if ("skip" in r) throw new Error("skipped");
    expect(r.payment).toMatchObject({
      status: "reversed",
      reversedOn: "2026-10-01",
      reversalReason: "Reversed in the legacy office",
    });
    expect(mapLegacyPayment({ amount: 1 })).toEqual({ skip: "no date" });
  });
});

describe("mapLegacyBankLine", () => {
  it("keeps the statement line and the payment it was matched to", () => {
    expect(
      mapLegacyBankLine(
        {
          key: "CODA:1:5",
          date: "2026-10-03",
          amount: -12.5,
          name: "KBC",
          st: "open",
          paymentId: 9,
        },
        "77",
      ),
    ).toEqual({
      line: {
        dedupKey: "CODA:1:5",
        source: "legacy",
        account: null,
        date: "2026-10-03",
        amountCents: -1250,
        name: "KBC",
        iban: null,
        comm: null,
        ogm: null,
        state: "matched",
      },
      legacyPaymentId: "9",
    });
  });

  it("keys a line without its own key by its legacy id, and needs a date", () => {
    expect(mapLegacyBankLine({ date: "2026-10-03", amount: 1 }, "77")?.line).toMatchObject({
      dedupKey: "legacy:77",
      state: "open",
    });
    expect(mapLegacyBankLine({ amount: 1 }, "77")).toBeNull();
  });
});
