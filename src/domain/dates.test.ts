import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayNumber,
  dayOfWeek,
  daysBetween,
  fromDayNumber,
  isWeekend,
  monthLength,
  parseYmd,
  yymm,
} from "./dates";

describe("dates", () => {
  it("parses only real calendar days", () => {
    expect(parseYmd("2026-09-23")).toEqual({ y: 2026, m: 9, d: 23 });
    expect(parseYmd("2026-02-30")).toBeNull();
    expect(parseYmd("2026-9-3")).toBeNull();
    expect(parseYmd("")).toBeNull();
    expect(parseYmd(null)).toBeNull();
  });

  it("round-trips day numbers across centuries and leap years", () => {
    for (const d of ["1970-01-01", "2000-02-29", "2024-12-31", "2100-03-01", "1899-12-31"]) {
      expect(fromDayNumber(dayNumber(d))).toBe(d);
    }
    expect(dayNumber("1970-01-01")).toBe(0);
  });

  it("adds days over month, year and DST boundaries", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("not a day", 1)).toBe("");
  });

  it("counts days between, NaN when either side is not a day", () => {
    expect(daysBetween("2026-09-01", "2026-09-23")).toBe(22);
    expect(daysBetween("2026-09-23", "2026-09-01")).toBe(-22);
    expect(daysBetween("x", "2026-09-01")).toBeNaN();
  });

  it("knows the weekday without a clock", () => {
    expect(dayOfWeek("2026-09-23")).toBe(3); // Wednesday
    expect(dayOfWeek("1970-01-01")).toBe(4); // Thursday
    expect(dayOfWeek("1969-12-28")).toBe(0); // Sunday, before the epoch
    expect(isWeekend("2026-09-26")).toBe(true);
    expect(dayOfWeek("bad")).toBe(-1);
  });

  it("clamps month arithmetic to the month's end", () => {
    expect(monthLength(2026, 2)).toBe(28);
    expect(monthLength(2028, 2)).toBe(29);
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });

  it("gives the numbering month key", () => {
    expect(yymm("2026-09-23")).toBe("2609");
    expect(() => yymm("2026-13-01")).toThrow();
  });
});
