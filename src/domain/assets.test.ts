import { describe, expect, it } from "vitest";
import {
  type Asset,
  assetBook,
  assetEntries,
  assetSchedule,
  defaultYears,
  lastMonthEnd,
  yearsProblem,
} from "./assets";

const laptop: Asset = {
  id: "a1",
  name: "Laptop",
  acquiredOn: "2026-01-15",
  costCents: 100_000,
  years: 3,
  account: "230000",
  disposedOn: null,
  disposeNote: null,
};

describe("assetSchedule", () => {
  it("depreciates month by month from the month it was bought, only months that ended", () => {
    const s = assetSchedule(laptop, "2026-03-31");
    expect(s.map((m) => [m.date, m.cents])).toEqual([
      ["2026-01-31", 2_778],
      ["2026-02-28", 2_778],
      ["2026-03-31", 2_778],
    ]);
  });

  it("puts the cents left on the last month so the total is exactly the cost", () => {
    const all = assetSchedule(laptop, "2030-12-31");
    expect(all).toHaveLength(36);
    expect(all.reduce((s, m) => s + m.cents, 0)).toBe(100_000);
    expect(all[35].cents).toBe(100_000 - 35 * 2_778);
  });

  it("stops before the month it was disposed of", () => {
    expect(assetSchedule({ ...laptop, disposedOn: "2026-02-10" }, "2026-12-31")).toHaveLength(1);
  });
});

describe("assetEntries", () => {
  it("books each month on 630200 against 230900", () => {
    const [e] = assetEntries(laptop, "2026-01-31");
    expect(e.lines).toEqual([
      { account: "630200", cents: 2_778 },
      { account: "230900", cents: -2_778 },
    ]);
  });

  it("takes a disposed asset off the books, the book value as a loss", () => {
    const sold = { ...laptop, disposedOn: "2026-02-10" };
    const last = assetEntries(sold, "2026-01-31").at(-1)!;
    expect(last.date).toBe("2026-02-10");
    expect(last.lines).toEqual([
      { account: "230900", cents: 2_778 },
      { account: "663000", cents: 97_222 },
      { account: "230000", cents: -100_000 },
    ]);
    expect(assetBook(sold, "2026-12-31").bookValueCents).toBe(0);
  });
});

describe("helpers", () => {
  it("gives IT three years and other equipment five", () => {
    expect(defaultYears("Dell laptop")).toBe(3);
    expect(defaultYears("Forklift")).toBe(5);
  });

  it("takes the last day of the previous month", () => {
    expect(lastMonthEnd("2026-03-01")).toBe("2026-02-28");
  });

  it("refuses new years once a booked month is closed", () => {
    expect(yearsProblem(laptop, "2026-03-31", "2026-02-28")).toMatch(/^2 months are/);
    expect(yearsProblem(laptop, "2026-03-31", null)).toBeNull();
  });
});
