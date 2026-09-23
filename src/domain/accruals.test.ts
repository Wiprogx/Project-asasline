import { describe, expect, it } from "vitest";
import { accrualEntries, accrualLines } from "./accruals";

describe("accrualLines", () => {
  it("keeps what the quotation expected and no supplier invoiced yet, largest first", () => {
    const rows = accrualLines([
      { bookingId: "a", ref: "SB1", expectedCents: 50_000, billedCents: 20_000 },
      { bookingId: "b", ref: "SB2", expectedCents: 90_000, billedCents: 0 },
      { bookingId: "c", ref: "SB3", expectedCents: 10_000, billedCents: 9_950 },
      { bookingId: "d", ref: "SB4", expectedCents: 10_000, billedCents: 12_000 },
    ]);
    expect(rows.map((r) => [r.ref, r.cents])).toEqual([
      ["SB2", 90_000],
      ["SB1", 30_000],
    ]);
  });
});

describe("accrualEntries", () => {
  const [booked, reversal] = accrualEntries({
    id: "r1",
    onDate: "2026-08-31",
    lines: [
      { bookingId: "a", ref: "SB1", cents: 30_000 },
      { bookingId: "b", ref: "SB2", cents: 90_000 },
    ],
  });

  it("books each shipment's cost against 444000 on the day", () => {
    expect(booked.date).toBe("2026-08-31");
    expect(booked.lines).toEqual([
      { account: "604000", cents: 30_000, label: "SB1" },
      { account: "604000", cents: 90_000, label: "SB2" },
      { account: "444000", cents: -120_000, label: "Invoices to receive" },
    ]);
  });

  it("reverses it the next day", () => {
    expect(reversal.date).toBe("2026-09-01");
    expect(reversal.lines.map((l) => l.cents)).toEqual([-30_000, -90_000, 120_000]);
  });
});
