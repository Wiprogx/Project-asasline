import { describe, expect, it } from "vitest";
import {
  isTime,
  joinMoment,
  momentWords,
  QUARTER_HOUR_SECONDS,
  snapQuarterHour,
  splitMoment,
} from "./moments";

describe("a moment: a day and an hour as one field", () => {
  it("steps by a quarter of an hour", () => {
    expect(QUARTER_HOUR_SECONDS).toBe(15 * 60);
  });

  it("snaps an hour to the nearest quarter, never past the hour (legacy qhSnap)", () => {
    expect(snapQuarterHour("11:20")).toBe("11:15");
    expect(snapQuarterHour("11:23")).toBe("11:30");
    expect(snapQuarterHour("23:53")).toBe("23:45");
    expect(snapQuarterHour("08:00")).toBe("08:00");
    expect(snapQuarterHour("nonsense")).toBe("nonsense");
  });

  it("shows a day with its hour, midnight for a day whose hour is not known, nothing without a day", () => {
    expect(joinMoment("2026-11-12", "08:15")).toBe("2026-11-12T08:15");
    expect(joinMoment("2026-11-12", null)).toBe("2026-11-12T00:00");
    expect(joinMoment(null, "08:15")).toBe("");
  });

  it("reads the day and the hour back, both null once cleared", () => {
    expect(splitMoment("2026-11-12T08:15")).toEqual({ date: "2026-11-12", time: "08:15" });
    expect(splitMoment("2026-11-12T08:15:00")).toEqual({ date: "2026-11-12", time: "08:15" });
    expect(splitMoment("")).toEqual({ date: null, time: null });
  });

  it("writes a moment in words, the day alone without an hour", () => {
    expect(momentWords("2026-11-12", "08:00")).toBe("2026-11-12 08:00");
    expect(momentWords("2026-11-12", null)).toBe("2026-11-12");
    expect(momentWords(null, "08:00")).toBe("");
    expect(isTime("24:00")).toBe(false);
  });
});
