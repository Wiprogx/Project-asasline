import { describe, expect, it } from "vitest";
import { pageOf, periodOf, presets } from "./period";

describe("periodOf", () => {
  it("defaults to the year to date", () => {
    expect(periodOf({}, "2026-09-23")).toEqual({ from: "2026-01-01", to: "2026-09-23" });
  });

  it("ignores a malformed date", () => {
    expect(periodOf({ from: "yesterday", to: ["a"] }, "2026-09-23").from).toBe("2026-01-01");
  });

  it("puts a reversed range the right way round", () => {
    expect(periodOf({ from: "2026-05-01", to: "2026-02-01" }, "2026-09-23")).toEqual({
      from: "2026-02-01",
      to: "2026-05-01",
    });
  });
});

describe("presets", () => {
  it("takes last month across a year end", () => {
    const last = presets("2026-01-15").find((p) => p.label === "Last month")!;
    expect(last.period).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("ends the quarter on its last day", () => {
    const q = presets("2026-08-02").find((p) => p.label === "This quarter")!;
    expect(q.period).toEqual({ from: "2026-07-01", to: "2026-09-30" });
  });
});

describe("pageOf", () => {
  const xs = Array.from({ length: 250 }, (_, i) => i);

  it("cuts a list into pages", () => {
    expect(pageOf(xs, "2", 100)).toMatchObject({ page: 2, pages: 3, total: 250 });
    expect(pageOf(xs, "2", 100).items[0]).toBe(100);
  });

  it("falls back to the first page, and a page past the end shows the last", () => {
    expect(pageOf(xs, "x", 100).page).toBe(1);
    expect(pageOf(xs, 9, 100).items).toHaveLength(50);
  });
});
