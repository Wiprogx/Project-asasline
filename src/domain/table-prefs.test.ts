import { describe, expect, it } from "vitest";
import { clampWidth, mergeTablePrefs, parseTablePrefs, WIDTH_MAX, WIDTH_MIN } from "./table-prefs";

const ALL = [{ key: "a" }, { key: "b" }, { key: "c" }] as const;
const DEFAULTS = ["a", "b"] as const;

describe("parseTablePrefs", () => {
  it("gives the defaults when nothing was saved", () => {
    expect(parseTablePrefs(ALL, DEFAULTS, null)).toEqual({ columns: ["a", "b"], widths: {} });
  });

  it("gives the default columns when the saved value is not a column list", () => {
    expect(parseTablePrefs(ALL, DEFAULTS, "x").columns).toEqual(["a", "b"]);
    expect(parseTablePrefs(ALL, DEFAULTS, { columns: "a,b" }).columns).toEqual(["a", "b"]);
    expect(parseTablePrefs(ALL, DEFAULTS, []).columns).toEqual(["a", "b"]);
  });

  it("keeps the chosen columns in the list's own order without unknown keys", () => {
    expect(parseTablePrefs(ALL, DEFAULTS, { columns: ["c", "zz", "a"] }).columns).toEqual([
      "a",
      "c",
    ]);
  });

  it("allows a person to hide every column", () => {
    expect(parseTablePrefs(ALL, DEFAULTS, { columns: [] }).columns).toEqual([]);
  });

  it("keeps a width only for a sizable key with a finite number, clamped", () => {
    const got = parseTablePrefs(ALL, DEFAULTS, {
      widths: { a: 120.4, b: 5, c: 9999, name: 300, zz: 100, bad: "12", nan: NaN },
    });
    expect(got.widths).toEqual({ a: 120, b: WIDTH_MIN, c: WIDTH_MAX });
  });

  it("takes the sizable keys given over the columns", () => {
    const named = parseTablePrefs(ALL, DEFAULTS, { widths: { name: 300, b: 90 } }, ["name", "a"]);
    expect(named.widths).toEqual({ name: 300 });
  });
});

describe("mergeTablePrefs", () => {
  const prev = { columns: ["a"], widths: { a: 100 } };

  it("replaces the part the patch names", () => {
    expect(mergeTablePrefs(prev, { columns: ["b"] })).toEqual({
      columns: ["b"],
      widths: { a: 100 },
    });
    expect(mergeTablePrefs(prev, { widths: {} })).toEqual({ columns: ["a"], widths: {} });
  });

  it("keeps everything when the patch is empty", () => {
    expect(mergeTablePrefs(prev, {})).toEqual(prev);
  });
});

describe("clampWidth", () => {
  it("rounds to whole pixels", () => {
    expect(clampWidth(100.6)).toBe(101);
  });

  it("bounds the width to the range", () => {
    expect(clampWidth(10)).toBe(WIDTH_MIN);
    expect(clampWidth(10_000)).toBe(WIDTH_MAX);
  });
});
