import { describe, expect, it } from "vitest";
import { deltaPercent, parsePeriodKey, periodScope } from "./periods";

describe("the period and the one before", () => {
  it("knows the week, month, quarter and year, Monday-first, and all time compares to nothing", () => {
    expect(parsePeriodKey("quarter")).toBe("quarter");
    expect(parsePeriodKey("x")).toBe("all");
    expect(periodScope("week", "2026-10-10")).toEqual({
      from: "2026-10-05",
      to: "2026-10-11",
      label: "Week of 10-05",
    });
    expect(periodScope("week", "2026-10-10", 1)?.from).toBe("2026-09-28");
    expect(periodScope("month", "2026-10-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      label: "Oct 2026",
    });
    expect(periodScope("month", "2026-01-10", 1)).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
      label: "Dec 2025",
    });
    expect(periodScope("quarter", "2026-10-10")).toEqual({
      from: "2026-10-01",
      to: "2026-12-31",
      label: "Q4 2026",
    });
    expect(periodScope("quarter", "2026-02-10", 1)).toEqual({
      from: "2025-10-01",
      to: "2025-12-31",
      label: "Q4 2025",
    });
    expect(periodScope("year", "2026-10-10", 1)).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
      label: "2025",
    });
    expect(periodScope("all", "2026-10-10")).toBeNull();
  });
  it("says the change in whole percent, a hundred from nothing, nothing without both sides", () => {
    expect(deltaPercent(120, 100)).toBe(20);
    expect(deltaPercent(80, 100)).toBe(-20);
    expect(deltaPercent(5, 0)).toBe(100);
    expect(deltaPercent(0, 0)).toBe(0);
    expect(deltaPercent(null, 3)).toBeNull();
  });
});
