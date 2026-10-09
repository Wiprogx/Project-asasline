import { describe, expect, it } from "vitest";
import { bankAccountLines, parseBankAccountLines, standingOf } from "./bank-accounts";

const belfius = {
  name: "Belfius current",
  iban: "BE68539007547034",
  bic: "GKCCBEBB",
  account: "550000",
  openingCents: 125_000,
  openingDate: "2026-01-01",
};

describe("bank accounts", () => {
  it("round-trips through the lines, cleaning the IBAN and the BIC", () => {
    const { accounts, problems } = parseBankAccountLines(
      "Belfius current | be68 5390 0754 7034 | gkccbebb | 550000 | 1250.00 | 2026-01-01",
    );
    expect(problems).toEqual([]);
    expect(accounts).toEqual([belfius]);
    expect(bankAccountLines(accounts)).toBe(
      "Belfius current | BE68539007547034 | GKCCBEBB | 550000 | 1250.00 | 2026-01-01",
    );
  });
  it("refuses a wrong IBAN, a non-bank ledger account and the same account twice", () => {
    expect(
      parseBankAccountLines("X | BE68539007547035 | | 550000 | 0 | 2026-01-01").problems[0],
    ).toMatch(/IBAN/);
    expect(
      parseBankAccountLines("X | BE68539007547034 | | 400000 | 0 | 2026-01-01").problems[0],
    ).toMatch(/55/);
    const twice = bankAccountLines([belfius, belfius]);
    expect(parseBankAccountLines(twice).problems[0]).toMatch(/twice/);
  });
  it("stands at the opening plus the lines since, and counts what is still to reconcile", () => {
    const s = standingOf(
      belfius,
      [
        {
          account: "BE68 5390 0754 7034",
          date: "2026-02-01",
          amountCents: 100_000,
          state: "matched",
        },
        { account: "BE68539007547034", date: "2026-02-02", amountCents: -1_234, state: "open" },
        { account: "BE68539007547034", date: "2025-12-31", amountCents: 999_999, state: "matched" },
        { account: "BE00000000000000", date: "2026-02-02", amountCents: 5_000, state: "open" },
      ],
      223_766,
    );
    expect(s).toEqual({
      statementCents: 223_766,
      booksCents: 223_766,
      openCount: 1,
      openCents: -1_234,
    });
  });
});
