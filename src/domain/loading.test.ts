import { describe, expect, it } from "vitest";
import {
  boxLoading,
  DEFAULT_LOADING_MODES,
  isDropMode,
  loadingModeLines,
  modeNote,
  parseLoadingModeLines,
  parseStopLines,
  stopLines,
  truckerCopyGaps,
} from "./loading";

describe("loading modes", () => {
  it("ship the legacy table: twelve modes, two of them drop-offs, waiting time from the third hour", () => {
    expect(DEFAULT_LOADING_MODES).toHaveLength(12);
    expect(DEFAULT_LOADING_MODES.filter((m) => m.drop).map((m) => m.name)).toEqual([
      "Drop off container on ground",
      "Disconnect chassis",
    ]);
    expect(DEFAULT_LOADING_MODES[2]).toMatchObject({
      hours: 3,
      surcharge: "Waiting time at loading (per hour)",
      qty: 1,
    });
    expect(isDropMode(DEFAULT_LOADING_MODES, "Disconnect chassis")).toBe(true);
    expect(isDropMode(DEFAULT_LOADING_MODES, "Direct loading — 2 hours")).toBe(false);
  });

  it("say what the mode means for the price", () => {
    expect(modeNote(DEFAULT_LOADING_MODES, null)).toMatch(/Pick one/);
    expect(modeNote(DEFAULT_LOADING_MODES, "Direct loading — 1 hour")).toMatch(
      /^1 hour of loading/,
    );
    expect(modeNote(DEFAULT_LOADING_MODES, "Drop off container on ground")).toMatch(
      /no loading hours/,
    );
  });

  it("round-trip through the Settings lines", () => {
    const { modes, problems } = parseLoadingModeLines(loadingModeLines(DEFAULT_LOADING_MODES));
    expect(problems).toEqual([]);
    expect(modes).toEqual(DEFAULT_LOADING_MODES);
    expect(parseLoadingModeLines("Odd | x").problems[0]).toMatch(/hours/);
    expect(parseLoadingModeLines("A | 1 | sideways").problems[0]).toMatch(/direct|drop/);
    expect(parseLoadingModeLines("A | 1\nA | 2").problems[0]).toMatch(/twice/);
  });
});

describe("stops", () => {
  it("read an address, an optional day and an optional hour per line, and write them back", () => {
    const { stops, problem } = parseStopLines("Depot Antwerp | 2026-10-12 | 08:30\nShipper gate\n");
    expect(problem).toBeNull();
    expect(stops).toEqual([
      { address: "Depot Antwerp", date: "2026-10-12", time: "08:30" },
      { address: "Shipper gate", date: null, time: null },
    ]);
    expect(stopLines(stops)).toBe("Depot Antwerp | 2026-10-12 | 08:30\nShipper gate");
    expect(parseStopLines("X | 2026-02-30").problem).toMatch(/date/);
    expect(parseStopLines("X | 2026-02-10 | 25:00").problem).toMatch(/hour/);
  });
});

describe("a box's loading details", () => {
  const booking = {
    loadAddress: "Rue du Port 1, Brussels",
    loadDate: "2026-10-12",
    loadTime: "09:00",
    loadingMode: "Direct loading — 2 hours",
  };
  const blank = { loadAddress: null, loadDate: null, loadTime: null, loadingMode: null };

  it("stand in for the booking's details when there is one box only", () => {
    expect(boxLoading({ ...booking, boxCount: 1 }, blank)).toEqual({
      address: booking.loadAddress,
      date: "2026-10-12",
      time: "09:00",
      mode: booking.loadingMode,
    });
  });

  it("inherit nothing with two boxes: a missing detail is missing", () => {
    expect(boxLoading({ ...booking, boxCount: 2 }, blank)).toEqual({
      address: null,
      date: null,
      time: null,
      mode: null,
    });
    expect(truckerCopyGaps({ ...booking, boxCount: 2 }, { ...blank, number: null })).toEqual([
      "loading address",
      "loading date",
      "loading mode",
      "container number",
    ]);
  });

  it("never mix the hour of one box with the date of another", () => {
    const own = { ...blank, loadDate: "2026-10-13" };
    expect(boxLoading({ ...booking, boxCount: 1 }, own)).toMatchObject({
      date: "2026-10-13",
      time: null,
    });
    expect(truckerCopyGaps({ ...booking, boxCount: 1 }, { ...own, number: "MSCU1234565" })).toEqual(
      [],
    );
  });
});
