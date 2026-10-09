import { describe, expect, it } from "vitest";
import { costSummary, varianceWords } from "./cost";

const fmt = (c: number) => `€${(c / 100).toFixed(2)}`;

describe("the cost and margin of a shipment", () => {
  const lines = [
    { description: "Ocean freight", qty: 2, costCents: 180_000 },
    { description: "Customs", qty: 1, costCents: 5_000 },
  ];

  it("reads the expected cost from the quotation and the profit against it", () => {
    const s = costSummary({
      quoted: true,
      revenueCents: 500_000,
      expectedLines: lines,
      recordedCents: 0,
    });
    expect(s.expectedCents).toBe(365_000);
    expect(s.profitCents).toBe(135_000);
    expect(s.marginPct).toBe(27);
    expect(s.varianceCents).toBe(-365_000);
  });

  it("compares the bills received against what was expected", () => {
    const s = costSummary({
      quoted: true,
      revenueCents: 500_000,
      expectedLines: lines,
      recordedCents: 377_000,
    });
    expect(s.varianceCents).toBe(12_000);
    expect(s.profitRecordedCents).toBe(123_000);
    expect(varianceWords(s.varianceCents, fmt)).toEqual({ text: "+ €120.00 over", tone: "danger" });
    expect(varianceWords(-4_000, fmt)).toEqual({ text: "− €40.00 under", tone: "success" });
    expect(varianceWords(20, fmt)).toEqual({ text: "matches", tone: "neutral" });
  });

  it("takes the recorded bills as the cost of a booking made without a quotation", () => {
    const s = costSummary({
      quoted: false,
      revenueCents: 0,
      expectedLines: [],
      recordedCents: 90_000,
    });
    expect(s.expectedCents).toBeNull();
    expect(s.varianceCents).toBeNull();
    expect(s.profitCents).toBe(-90_000);
    expect(s.marginPct).toBe(0);
    expect(varianceWords(null, fmt).text).toBe("nothing expected");
  });
});
