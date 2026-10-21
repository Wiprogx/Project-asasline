import { describe, expect, it } from "vitest";
import { partnerBalance } from "./partner-balance";

const doc = (o: Partial<Parameters<typeof partnerBalance>[0][number]>) => ({
  kind: "invoice" as const,
  grossCents: 1000,
  settledCents: 0,
  creditedCents: 0,
  dueDate: "2026-10-31",
  ...o,
});

describe("partnerBalance", () => {
  it("adds what they owe, what of it is overdue, and what we owe them", () => {
    expect(
      partnerBalance(
        [
          doc({}),
          doc({ dueDate: "2026-10-01", settledCents: 400 }),
          doc({ kind: "bill", grossCents: 250 }),
          doc({ grossCents: 500, creditedCents: 500 }),
        ],
        "2026-10-21",
      ),
    ).toEqual({ theyOweCents: 1600, overdueCents: 600, overdueCount: 1, weOweCents: 250 });
  });

  it("is all zero when everything is settled", () => {
    expect(partnerBalance([doc({ settledCents: 1000 })], "2026-10-21")).toEqual({
      theyOweCents: 0,
      overdueCents: 0,
      overdueCount: 0,
      weOweCents: 0,
    });
  });
});
