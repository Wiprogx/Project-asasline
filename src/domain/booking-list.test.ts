import { describe, expect, it } from "vitest";
import {
  BOOKING_COLUMNS,
  BOOKING_REF_COLUMN,
  BOOKING_VIEW,
  closingLate,
  DEFAULT_BOOKING_COLUMNS,
} from "./booking-list";
import { parseTableView } from "./table-prefs";

describe("the bookings columns", () => {
  it("offers every column but the reference, which is always first and sizable too", () => {
    expect(BOOKING_COLUMNS.map((c) => c.key)).not.toContain("ref");
    expect(BOOKING_VIEW.sizable[0]).toBe(BOOKING_REF_COLUMN.key);
    expect(BOOKING_VIEW.sizable).toHaveLength(BOOKING_COLUMNS.length + 1);
    for (const k of DEFAULT_BOOKING_COLUMNS)
      expect(BOOKING_COLUMNS.some((c) => c.key === k)).toBe(true);
  });

  it("reads a saved view in the table's order and falls back to the defaults", () => {
    expect(parseTableView(BOOKING_VIEW, { columns: ["eta", "status"] }).columns).toEqual([
      "status",
      "eta",
    ]);
    expect(parseTableView(BOOKING_VIEW, null).columns).toEqual(DEFAULT_BOOKING_COLUMNS);
    expect(parseTableView(BOOKING_VIEW, { widths: { ref: 300, bogus: 100 } }).widths).toEqual({
      ref: 300,
    });
  });

  it("marks a closing passed before sailing", () => {
    expect(closingLate("2026-10-01", "confirmed", "2026-10-13")).toBe(true);
    expect(closingLate("2026-10-01", "in_transit", "2026-10-13")).toBe(false);
    expect(closingLate(null, "confirmed", "2026-10-13")).toBe(false);
  });
});
