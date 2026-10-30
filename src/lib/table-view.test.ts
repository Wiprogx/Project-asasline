import { describe, expect, it } from "vitest";
import { compareValues, nextSort, type TableSpec, type TableState, viewRows } from "./table-view";

type Row = { name: string; n: number | null; on: boolean };
const rows: Row[] = [
  { name: "Port 10", n: 3, on: true },
  { name: "port 2", n: null, on: false },
  { name: "Antwerp", n: 1, on: true },
];
const spec: TableSpec<Row> = {
  search: (r) => [r.name],
  filters: [
    {
      key: "state",
      label: "State",
      options: [{ value: "on", label: "On" }],
      test: (r, v) => (v === "on") === r.on,
    },
  ],
  sorts: { name: (r) => r.name, n: (r) => r.n },
};
const base: TableState = { q: "", sort: null, dir: "asc", filters: {} };

describe("viewRows", () => {
  it("keeps the table's own order with no sort", () => {
    expect(viewRows(rows, spec, base)).toEqual(rows);
  });
  it("searches whatever the case", () => {
    expect(viewRows(rows, spec, { ...base, q: " PORT " }).map((r) => r.name)).toEqual([
      "Port 10",
      "port 2",
    ]);
  });
  it("filters by a chosen value and ignores an empty one", () => {
    expect(viewRows(rows, spec, { ...base, filters: { state: "on" } })).toHaveLength(2);
    expect(viewRows(rows, spec, { ...base, filters: { state: "" } })).toHaveLength(3);
  });
  it("sorts words numerically, both ways", () => {
    const asc = viewRows(rows, spec, { ...base, sort: "name" }).map((r) => r.name);
    expect(asc).toEqual(["Antwerp", "port 2", "Port 10"]);
    const desc = viewRows(rows, spec, { ...base, sort: "name", dir: "desc" }).map((r) => r.name);
    expect(desc).toEqual(["Port 10", "port 2", "Antwerp"]);
  });
  it("puts an empty value last whichever the direction", () => {
    expect(viewRows(rows, spec, { ...base, sort: "n" }).map((r) => r.n)).toEqual([1, 3, null]);
    expect(viewRows(rows, spec, { ...base, sort: "n", dir: "desc" }).map((r) => r.n)).toEqual([
      3,
      1,
      null,
    ]);
  });
  it("ignores an unknown sort key from the URL", () => {
    expect(viewRows(rows, spec, { ...base, sort: "nope" })).toEqual(rows);
  });
});

describe("compareValues and nextSort", () => {
  it("compares booleans and numbers", () => {
    expect(compareValues(true, false, "asc")).toBeGreaterThan(0);
    expect(compareValues(2, 10, "desc")).toBeGreaterThan(0);
  });
  it("cycles ascending, descending, off", () => {
    expect(nextSort({ sort: null, dir: "asc" }, "a")).toEqual({ sort: "a", dir: "asc" });
    expect(nextSort({ sort: "a", dir: "asc" }, "a")).toEqual({ sort: "a", dir: "desc" });
    expect(nextSort({ sort: "a", dir: "desc" }, "a")).toEqual({ sort: null, dir: "asc" });
    expect(nextSort({ sort: "a", dir: "desc" }, "b")).toEqual({ sort: "b", dir: "asc" });
  });
});
