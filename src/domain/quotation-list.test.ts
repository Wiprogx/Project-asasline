import { describe, expect, it } from "vitest";
import { quotationFigures } from "./quotation-list";

describe("quotationFigures", () => {
  it("counts open, won and lost, values the won ones, and rates the wins over what was decided", () => {
    expect(
      quotationFigures([
        { status: "draft", valueCents: 90_000 },
        { status: "sent", valueCents: 120_000 },
        { status: "accepted", valueCents: 250_000 },
        { status: "accepted", valueCents: 50_000 },
        { status: "declined", valueCents: 70_000 },
        { status: "cancelled", valueCents: 10_000 },
      ]),
    ).toEqual({
      count: 6,
      open: 2,
      accepted: 2,
      declined: 1,
      acceptedValueCents: 300_000,
      valueCents: 590_000,
      winRate: 67,
    });
  });
  it("has no win rate before anything was decided", () => {
    expect(quotationFigures([{ status: "sent", valueCents: 1 }]).winRate).toBeNull();
  });
});
