import { describe, expect, it } from "vitest";
import {
  bookingFieldsOf,
  cutoffsFor,
  DEFAULT_CUTOFFS,
  sailingLabel,
  sailingProblem,
} from "./vessels";

const roma = { name: "MSC ROMA", voyage: "FA534A", etd: "2026-09-01", eta: "2026-09-19" };

describe("cutoffsFor", () => {
  it("puts each closing its days before the ETD, across a month end", () => {
    expect(cutoffsFor("2026-09-01", DEFAULT_CUTOFFS)).toEqual({
      customsClosing: "2026-08-29",
      siClosing: "2026-08-30",
      vgmClosing: "2026-08-30",
      portCutOff: "2026-08-31",
    });
  });
});

describe("bookingFieldsOf", () => {
  it("gives a booking the ship, the voyage, the dates and the closings", () => {
    expect(bookingFieldsOf(roma, DEFAULT_CUTOFFS)).toMatchObject({
      vesselName: "MSC ROMA",
      voyage: "FA534A",
      etd: "2026-09-01",
      eta: "2026-09-19",
      portCutOff: "2026-08-31",
    });
  });

  it("clears the closings of a sailing without an ETD rather than keep stale ones", () => {
    expect(bookingFieldsOf({ ...roma, etd: null }, DEFAULT_CUTOFFS).customsClosing).toBeNull();
  });
});

describe("sailings", () => {
  it("reads as ship, voyage, route and ETD", () => {
    expect(sailingLabel({ ...roma, pol: "BEANR", pod: "CMDLA" })).toBe(
      "MSC ROMA · FA534A — BEANR › CMDLA · ETD 2026-09-01",
    );
  });

  it("refuses an ETA before the ETD", () => {
    expect(sailingProblem({ etd: "2026-09-10", eta: "2026-09-01" })).toMatch(/before the ETD/);
    expect(sailingProblem({ etd: "2026-09-10", eta: null })).toBeNull();
  });
});
