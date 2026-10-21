import { describe, expect, it } from "vitest";
import { mapLegacyEntry } from "./legacy-entries";

describe("mapLegacyEntry", () => {
  it("reads the lines as debit + and credit −, in cents", () => {
    expect(
      mapLegacyEntry({
        ref: "OD-2026-09-3",
        date: "2026-09-30",
        label: "Accrued rent",
        lines: [
          { acct: "612000", d: 1200, c: 0 },
          { acct: "492000", d: 0, c: 1200 },
        ],
        st: "posted",
      }),
    ).toEqual({
      entry: {
        ref: "OD-2026-09-3",
        date: "2026-09-30",
        label: "Accrued rent",
        lines: [
          { account: "612000", cents: 120000 },
          { account: "492000", cents: -120000 },
        ],
      },
      opening: false,
      reversedOn: null,
    });
  });

  it("brings a cancelled entry's reversal day, and says an opening entry is one", () => {
    const r = mapLegacyEntry({
      ref: "OB",
      date: "2026-01-01",
      opening: true,
      st: "cancelled",
      cancelledAt: "2026-02-01",
      lines: [
        { acct: "550000", d: 10, c: 0 },
        { acct: "100000", d: 0, c: 10 },
      ],
    });
    expect(r).toMatchObject({ opening: true, reversedOn: "2026-02-01" });
  });

  it("skips what does not balance or has no day", () => {
    expect(
      mapLegacyEntry({ ref: "X", date: "2026-01-01", lines: [{ acct: "612000", d: 1, c: 0 }] }),
    ).toEqual({ skip: "An entry needs two lines at least." });
    expect(mapLegacyEntry({ ref: "X" })).toEqual({ skip: "no day or reference" });
  });
});
