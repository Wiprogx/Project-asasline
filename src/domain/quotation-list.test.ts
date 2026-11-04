import { describe, expect, it } from "vitest";
import { DEFAULT_FIGURE_KEYS, parseFigureKeys, quotationFigures } from "./quotation-list";

describe("quotationFigures", () => {
  it("counts open, won and lost, values each side, and rates the wins over what was decided", () => {
    expect(
      quotationFigures([
        { status: "draft", valueCents: 90_000, destinations: 1 },
        { status: "sent", valueCents: 120_000, destinations: 2 },
        { status: "accepted", valueCents: 250_000, destinations: 1 },
        { status: "accepted", valueCents: 50_000 },
        { status: "declined", valueCents: 70_000 },
        { status: "cancelled", valueCents: 10_000 },
      ]),
    ).toEqual({
      count: 5,
      open: 2,
      accepted: 2,
      declined: 1,
      acceptedValueCents: 300_000,
      openValueCents: 210_000,
      declinedValueCents: 70_000,
      valueCents: 580_000,
      destinations: 4,
      winRate: 67,
      avgValueCents: 116_000,
    });
  });
  it("has no win rate before anything was decided, and no average with nothing shown", () => {
    expect(quotationFigures([{ status: "sent", valueCents: 1 }]).winRate).toBeNull();
    expect(quotationFigures([]).avgValueCents).toBeNull();
  });
});

describe("the figures chosen", () => {
  it("default to the legacy six, read the address bar in the defs' order, and can be none", () => {
    expect(parseFigureKeys(undefined)).toEqual(DEFAULT_FIGURE_KEYS);
    expect(parseFigureKeys("winRate,open,bogus")).toEqual(["open", "winRate"]);
    expect(parseFigureKeys("bogus")).toEqual(DEFAULT_FIGURE_KEYS);
    expect(parseFigureKeys("none")).toEqual([]);
  });
});
