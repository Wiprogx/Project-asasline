import { describe, expect, it } from "vitest";
import {
  bookingFieldsOf,
  cutoffsFor,
  DEFAULT_CUTOFFS,
  sailingLabel,
  sailingProblem,
  scheduleConflict,
} from "./vessels";

const roma = { name: "MSC ROMA", voyage: "FA534A", etd: "2026-09-01", eta: "2026-09-19" };

describe("cutoffsFor", () => {
  it("puts each closing its days before the ETD, across a month end, at the rule's hour", () => {
    expect(cutoffsFor("2026-09-01", DEFAULT_CUTOFFS)).toEqual({
      customsClosing: "2026-08-29",
      customsClosingTime: "12:00",
      siClosing: "2026-08-30",
      siClosingTime: "12:00",
      vgmClosing: "2026-08-30",
      vgmClosingTime: "16:00",
      portCutOff: "2026-08-31",
      portCutOffTime: "22:00",
    });
  });

  it("leaves a closing's hour empty when its rule names none", () => {
    const rules = { ...DEFAULT_CUTOFFS, portCutOff: { days: 1, time: null } };
    expect(cutoffsFor("2026-09-01", rules)).toMatchObject({
      portCutOff: "2026-08-31",
      portCutOffTime: null,
    });
  });
});

describe("bookingFieldsOf", () => {
  it("gives a booking the ship, the voyage, the dates with their hours and the closings", () => {
    expect(bookingFieldsOf({ ...roma, etdTime: "18:00" }, DEFAULT_CUTOFFS)).toMatchObject({
      vesselName: "MSC ROMA",
      voyage: "FA534A",
      etd: "2026-09-01",
      etdTime: "18:00",
      eta: "2026-09-19",
      etaTime: null,
      portCutOff: "2026-08-31",
      portCutOffTime: "22:00",
    });
  });

  it("clears the closings and their hours of a sailing without an ETD rather than keep stale ones", () => {
    const fields = bookingFieldsOf({ ...roma, etd: null, etdTime: "18:00" }, DEFAULT_CUTOFFS);
    expect(fields.customsClosing).toBeNull();
    expect(fields.customsClosingTime).toBeNull();
    expect(fields.etdTime).toBeNull();
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

describe("scheduleConflict", () => {
  it("names each date typed over the sailing's, and nothing when they agree or there is no sailing", () => {
    const v = { etd: "2026-09-01", eta: "2026-09-19" };
    expect(scheduleConflict({ etd: "2026-09-01", eta: "2026-09-19" }, v)).toEqual([]);
    expect(scheduleConflict({ etd: "2026-09-03", eta: "2026-09-19" }, v)).toEqual([
      "the page says the ship leaves 2026-09-03, the register says 2026-09-01",
    ]);
    expect(scheduleConflict({ etd: "2026-09-03", eta: "2026-09-21" }, v)).toHaveLength(2);
    expect(scheduleConflict({ etd: "2026-09-03", eta: null }, null)).toEqual([]);
    expect(scheduleConflict({ etd: null, eta: null }, v)).toEqual([]);
  });
});
