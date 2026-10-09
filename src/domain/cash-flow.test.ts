import { describe, expect, it } from "vitest";
import { cashFlow, cashKindOf } from "./cash-flow";
import type { Entry } from "./ledger";

const entry = (
  date: string,
  lines: Entry["lines"],
  kind: Entry["source"]["kind"] = "payment",
): Entry => ({
  date,
  journal: "BNK",
  ref: `P-${date}`,
  label: "",
  partner: null,
  source: { kind, id: date },
  lines,
});

describe("cash flow", () => {
  const bank = ["550000"];
  it("names a move by the account on the other side", () => {
    const b = new Set(bank);
    expect(
      cashKindOf(
        entry("2026-01-05", [
          { account: "550000", cents: 1000 },
          { account: "400000", cents: -1000 },
        ]),
        b,
      ),
    ).toBe("From customers");
    expect(
      cashKindOf(
        entry("2026-01-05", [
          { account: "550000", cents: -500 },
          { account: "440000", cents: 500 },
        ]),
        b,
      ),
    ).toBe("To suppliers");
    expect(
      cashKindOf(
        entry("2026-01-05", [
          { account: "550000", cents: -50 },
          { account: "657000", cents: 50 },
        ]),
        b,
      ),
    ).toBe("Bank charges and finance");
    expect(
      cashKindOf(
        entry(
          "2026-01-01",
          [
            { account: "550000", cents: 9000 },
            { account: "140000", cents: -9000 },
          ],
          "opening",
        ),
        b,
      ),
    ).toBe("Opening");
  });
  it("runs the cash from before the period through each month", () => {
    const f = cashFlow(
      [
        entry("2025-12-20", [
          { account: "550000", cents: 10_000 },
          { account: "400000", cents: -10_000 },
        ]),
        entry("2026-01-05", [
          { account: "550000", cents: 5_000 },
          { account: "400000", cents: -5_000 },
        ]),
        entry("2026-01-20", [
          { account: "550000", cents: -2_000 },
          { account: "440000", cents: 2_000 },
        ]),
        entry("2026-02-02", [
          { account: "550000", cents: -100 },
          { account: "657000", cents: 100 },
        ]),
        entry("2026-02-02", [
          { account: "400000", cents: 7_000 },
          { account: "700000", cents: -7_000 },
        ]),
      ],
      bank,
      "2026-01-01",
      "2026-02-28",
    );
    expect(f.months).toEqual(["2026-01", "2026-02"]);
    expect(f.kinds).toEqual(["From customers", "To suppliers", "Bank charges and finance"]);
    expect(f.startCents).toEqual({ "2026-01": 10_000, "2026-02": 13_000 });
    expect(f.netCents).toEqual({ "2026-01": 3_000, "2026-02": -100 });
    expect(f.endCents["2026-02"]).toBe(12_900);
  });
});
