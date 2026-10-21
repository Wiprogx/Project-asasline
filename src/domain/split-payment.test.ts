import { describe, expect, it } from "vitest";
import { splitProblem, splitTotal } from "./split-payment";

const part = (number: string, cents: number, openCents: number) => ({
  invoiceId: number,
  number,
  cents,
  openCents,
});

describe("splitProblem", () => {
  it("wants one invoice at least", () => {
    expect(splitProblem([part("INV/1", 0, 100)])).toBe(
      "Tick at least one invoice this payment settles.",
    );
  });

  it("refuses more than an invoice has open, naming it", () => {
    expect(splitProblem([part("INV/1", 150, 100)])).toBe("INV/1: only 1.00 is open.");
  });

  it("refuses a negative part", () => {
    expect(splitProblem([part("INV/1", -5, 100)])).toBe(
      "INV/1: a payment part cannot be negative.",
    );
  });

  it("lets parts up to what is open through", () => {
    expect(splitProblem([part("INV/1", 100, 100), part("INV/2", 40, 90)])).toBeNull();
  });
});

describe("splitTotal", () => {
  it("is the sum of the parts", () => {
    expect(splitTotal([part("a", 100, 100), part("b", 40, 90)])).toBe(140);
  });
});
