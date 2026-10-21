import { describe, expect, it } from "vitest";
import { chartLines, parseChartLines, withBuiltIn } from "./chart";
import { CHART } from "./ledger";

describe("the chart of accounts", () => {
  it("keeps every built-in account, a saved name winning, and the office's own", () => {
    const c = withBuiltIn({ "612000": "Stationery", "616000": "Insurance" });
    expect(c["612000"]).toBe("Stationery");
    expect(c["616000"]).toBe("Insurance");
    expect(c["550000"]).toBe(CHART["550000"]);
  });

  it("reads back what it writes", () => {
    const c = withBuiltIn({ "616000": "Insurance" });
    expect(parseChartLines(chartLines(c))).toEqual({ chart: c, problems: [] });
  });

  it("refuses a bad code, a missing name, a twice-typed account", () => {
    const base = chartLines(CHART);
    expect(parseChartLines(`${base}\n61600 | X`).problems).toEqual([
      expect.stringMatching(/^Line \d+: an account of six digits/),
    ]);
    expect(parseChartLines(`${base}\n616000 |`).problems[0]).toMatch(/the account's name/);
    expect(parseChartLines(`${base}\n612000 | Again`).problems[0]).toMatch(/612000 is there twice/);
  });

  it("refuses to drop an account the books post to", () => {
    const without = chartLines(CHART)
      .split("\n")
      .filter((l) => !l.startsWith("550000"))
      .join("\n");
    expect(parseChartLines(without).problems).toEqual([
      "The books post to 550000 — rename them if you like, never remove them.",
    ]);
  });
});
