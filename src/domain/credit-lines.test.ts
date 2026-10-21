import { describe, expect, it } from "vitest";
import { leftToCredit, partProblem } from "./credit-lines";

const lines = [
  { id: "a", qty: 3 },
  { id: "b", qty: 1 },
];

describe("leftToCredit", () => {
  it("is each line's quantity less what credit notes gave back", () => {
    expect(
      leftToCredit(lines, [
        { creditOfLineId: "a", qty: 1 },
        { creditOfLineId: "a", qty: 1 },
      ]),
    ).toEqual({ a: 1, b: 1 });
  });

  it("reads an unlinked credit note line as the whole invoice credited", () => {
    expect(leftToCredit(lines, [{ creditOfLineId: null, qty: 1 }])).toEqual({ a: 0, b: 0 });
  });

  it("never goes below nothing", () => {
    expect(leftToCredit(lines, [{ creditOfLineId: "b", qty: 5 }])).toEqual({ a: 3, b: 0 });
  });
});

describe("partProblem", () => {
  const left = { a: 2, b: 0 };
  it("wants something ticked", () => {
    expect(partProblem({ a: 0 }, left)).toBe("Tick at least one line to credit.");
  });

  it("refuses more than is left, naming the line", () => {
    expect(partProblem({ a: 3 }, left, () => "Ocean freight")).toBe(
      "Ocean freight: only 2 left to credit.",
    );
  });

  it("refuses a line that is not on the invoice and a part of a unit", () => {
    expect(partProblem({ z: 1 }, left)).toBe("A line asked for is not on this invoice.");
    expect(partProblem({ a: 1.5 }, left)).toBe("a: a whole quantity.");
  });

  it("lets a valid part through", () => {
    expect(partProblem({ a: 2 }, left)).toBeNull();
  });
});
