import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAPER_DOCS,
  DEFAULT_RELEASE_STATES,
  DEFAULT_SEND_MODES,
  DEFAULT_TRACK_STEPS,
  isPaperDoc,
  journey,
  parseReleaseStateLines,
  parseSendModeLines,
  parseTrackStepLines,
  releaseState,
  releaseStateLines,
  sendModeLines,
  startTrack,
  toggleStep,
  trackingUrl,
  trackStepLines,
} from "./release";

describe("release states", () => {
  it("ship the legacy six, three of them holds, and fall back to the first for an unknown code", () => {
    expect(DEFAULT_RELEASE_STATES.filter((s) => s.hold).map((s) => s.code)).toEqual([
      "hold_ship",
      "hold_pay",
      "hold_docs",
    ]);
    expect(releaseState(DEFAULT_RELEASE_STATES, "telex").label).toBe("Telex released");
    expect(releaseState(DEFAULT_RELEASE_STATES, "nonsense").code).toBe("pending");
    expect(releaseState(DEFAULT_RELEASE_STATES, null).code).toBe("pending");
  });
  it("round-trip through the Settings lines and refuse a bad third word", () => {
    const { states, problems } = parseReleaseStateLines(releaseStateLines(DEFAULT_RELEASE_STATES));
    expect(problems).toEqual([]);
    expect(states).toEqual(DEFAULT_RELEASE_STATES);
    expect(parseReleaseStateLines("x | Label | maybe").problems[0]).toMatch(/hold/);
  });
});

describe("the originals", () => {
  it("build the courier's tracking page only when the mode has one and a number was typed", () => {
    expect(trackingUrl(DEFAULT_SEND_MODES, "DHL", " 123 456 ")).toBe(
      "https://www.dhl.com/be-en/home/tracking.html?tracking-id=123%20456",
    );
    expect(trackingUrl(DEFAULT_SEND_MODES, "By hand", "123")).toBeNull();
    expect(trackingUrl(DEFAULT_SEND_MODES, "DHL", "")).toBeNull();
  });
  it("know which document types travel on paper", () => {
    expect(isPaperDoc(DEFAULT_PAPER_DOCS, "ORIGINAL BL")).toBe(true);
    expect(isPaperDoc(DEFAULT_PAPER_DOCS, "SEA WAYBILL")).toBe(false);
    expect(isPaperDoc(DEFAULT_PAPER_DOCS, "EXPRESS/TELEX RELEASE")).toBe(false);
  });
  it("round-trip the send modes through the Settings lines", () => {
    const { modes, problems } = parseSendModeLines(sendModeLines(DEFAULT_SEND_MODES));
    expect(problems).toEqual([]);
    expect(modes).toEqual(DEFAULT_SEND_MODES);
    expect(parseSendModeLines("X | tracks | ftp://nope").problems[0]).toMatch(/https/);
  });
});

describe("the journey", () => {
  it("starts with every step open, says where it stands, and dates a step the day it is ticked", () => {
    const track = startTrack(DEFAULT_TRACK_STEPS);
    expect(track).toHaveLength(8);
    expect(journey(track).stage).toBe("Not started");
    const one = toggleStep(track, 0, "2026-10-09");
    expect(one[0]).toMatchObject({ done: true, date: "2026-10-09" });
    expect(journey(one)).toMatchObject({ next: 1, stage: "Booking confirmed" });
    const back = toggleStep(one, 0, "2026-10-10");
    expect(back[0]).toMatchObject({ done: false, date: null });
    const all = track.map((t) => ({ ...t, done: true, date: "2026-10-09" }));
    expect(journey(all)).toMatchObject({ next: -1, stage: "Arrival at port" });
  });
  it("round-trips the steps through the Settings lines", () => {
    const { steps, problems } = parseTrackStepLines(trackStepLines(DEFAULT_TRACK_STEPS));
    expect(problems).toEqual([]);
    expect(steps).toEqual(DEFAULT_TRACK_STEPS);
    expect(parseTrackStepLines("Step | magic").problems[0]).toMatch(/auto|manual/);
  });
});
