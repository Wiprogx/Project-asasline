import { describe, expect, it } from "vitest";
import {
  boxLoading,
  DEFAULT_LOADING_MODES,
  isDropMode,
  loadingModeRow,
  loadingModesFromRows,
  modeNote,
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

  it("round-trip through the Settings rows", () => {
    const { modes, problems } = loadingModesFromRows(DEFAULT_LOADING_MODES.map(loadingModeRow));
    expect(problems).toEqual([]);
    expect(modes).toEqual(DEFAULT_LOADING_MODES);
    const row = (r: Partial<ReturnType<typeof loadingModeRow>>) => ({
      name: "A",
      hours: "1",
      kind: "direct",
      surcharge: "",
      qty: "",
      ...r,
    });
    expect(loadingModesFromRows([row({ hours: "x" })]).problems[0]).toMatch(/hours/);
    expect(loadingModesFromRows([row({ kind: "sideways" })]).problems[0]).toMatch(/direct|drop/);
    expect(loadingModesFromRows([row({}), row({ hours: "2" })]).problems[0]).toMatch(/twice/);
    expect(loadingModesFromRows([row({ name: " " })]).problems[0]).toMatch(/name/);
    // A surcharge with no quantity is charged once.
    expect(loadingModesFromRows([row({ surcharge: "Waiting" })]).modes[0]).toMatchObject({
      surcharge: "Waiting",
      qty: 1,
    });
  });
});
