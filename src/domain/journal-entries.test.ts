import { describe, expect, it } from "vitest";
import { entryProblem, manualEntry, parseEntryLines, reversalOf } from "./journal-entries";

describe("parseEntryLines", () => {
  it("reads one row per line: account, debit or credit, label", () => {
    expect(
      parseEntryLines("612000 | 120.00 | | Rent correction\n440000 | | 120 | Supplier\n\n"),
    ).toEqual({
      lines: [
        { account: "612000", cents: 12000, label: "Rent correction" },
        { account: "440000", cents: -12000, label: "Supplier" },
      ],
      problem: null,
    });
  });

  it("says which row is wrong", () => {
    expect(parseEntryLines("61200 | 1 |").problem).toBe("Row 1: an account of six digits first.");
    expect(parseEntryLines("612000 | 1 | 1").problem).toBe(
      "Row 1: a debit or a credit, not both or neither.",
    );
    expect(parseEntryLines("612000 | abc |").problem).toBe("Row 1: amounts like 120 or 120.00.");
  });

  it("refuses an entry that does not balance", () => {
    expect(parseEntryLines("612000 | 100 |\n440000 | | 90").problem).toBe(
      "The entry does not balance: debits and credits differ by 10.00.",
    );
  });
});

describe("entryProblem", () => {
  it("wants two lines at least", () => {
    expect(entryProblem([{ account: "612000", cents: 0 }])).toBe(
      "An entry needs two lines at least.",
    );
  });
});

describe("reversalOf and manualEntry", () => {
  it("undoes every amount, and reads the entry into the miscellaneous journal", () => {
    const lines = [
      { account: "612000", cents: 12000 },
      { account: "440000", cents: -12000 },
    ];
    expect(reversalOf(lines)).toEqual([
      { account: "612000", cents: -12000 },
      { account: "440000", cents: 12000 },
    ]);
    expect(
      manualEntry({ id: "e1", date: "2026-10-21", ref: "OD/2026/00001", label: "Fix", lines }),
    ).toMatchObject({
      journal: "MISC",
      ref: "OD/2026/00001",
      source: { kind: "manual", id: "e1" },
    });
  });
});
