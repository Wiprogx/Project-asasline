import { describe, expect, it } from "vitest";
import { listFigures } from "./booking-list";
import { billMatches, billStatus } from "./invoicing";

describe("the bookings list", () => {
  it("sums what the shown bookings are worth and were invoiced, and counts what still waits", () => {
    expect(
      listFigures([
        { valueCents: 125_000, billedCents: 0, billing: "not" },
        { valueCents: 90_000, billedCents: 45_000, billing: "partly" },
        { valueCents: 90_000, billedCents: 90_000, billing: "done" },
        { valueCents: 0, billedCents: 0, billing: "none" },
      ]),
    ).toEqual({
      count: 4,
      valueCents: 305_000,
      billedCents: 135_000,
      notInvoiced: 1,
      partly: 1,
      over: 0,
    });
  });
  it("filters as the legacy list did: open is not or partly, a status is itself, nothing is all", () => {
    expect(billMatches(billStatus(1000, 0), "open")).toBe(true);
    expect(billMatches(billStatus(1000, 500), "open")).toBe(true);
    expect(billMatches(billStatus(1000, 1000), "open")).toBe(false);
    expect(billMatches(billStatus(1000, 1200), "over")).toBe(true);
    expect(billMatches("none", undefined)).toBe(true);
  });
});
