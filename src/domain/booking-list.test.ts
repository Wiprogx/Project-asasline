import { describe, expect, it } from "vitest";
import {
  BOOKING_COLUMNS,
  bookingFigures,
  closingLate,
  DEFAULT_BOOKING_COLUMNS,
  parsePicks,
  topDestinations,
} from "./booking-list";

const row = (o: Partial<Parameters<typeof bookingFigures>[0][number]> = {}) => ({
  status: "confirmed",
  pod: "TRMER",
  boxes: 1,
  valueCents: 1000,
  billedCents: 0,
  billing: "not" as const,
  lateSteps: 0,
  ...o,
});

describe("the bookings figures", () => {
  it("counts boxes, destinations, the voyage and the money, never a cancelled one", () => {
    const f = bookingFigures([
      row({ boxes: 2 }),
      row({ pod: "CNSHA", status: "in_transit", billing: "done", billedCents: 1000, lateSteps: 2 }),
      row({ status: "cancelled", boxes: 9, valueCents: 99999 }),
    ]);
    expect(f).toMatchObject({
      count: 2,
      boxes: 3,
      dests: 2,
      transit: 1,
      value: 2000,
      billed: 1000,
      waiting: 1,
      late: 2,
    });
  });

  it("ranks the destinations by bookings, then boxes", () => {
    const top = topDestinations([row(), row({ boxes: 3 }), row({ pod: "CNSHA", boxes: 5 })]);
    expect(top[0]).toEqual({ label: "TRMER", n: 2, boxes: 4 });
    expect(top[1].label).toBe("CNSHA");
  });
});

describe("the columns and figures chosen", () => {
  it("reads the URL value, keeps the table order, and falls back to the defaults", () => {
    expect(parsePicks(BOOKING_COLUMNS, DEFAULT_BOOKING_COLUMNS, "eta,ref")).toEqual(["ref", "eta"]);
    expect(parsePicks(BOOKING_COLUMNS, DEFAULT_BOOKING_COLUMNS, "bogus")).toEqual(
      DEFAULT_BOOKING_COLUMNS,
    );
    expect(parsePicks(BOOKING_COLUMNS, DEFAULT_BOOKING_COLUMNS, "none")).toEqual([]);
  });

  it("marks a closing passed before sailing", () => {
    expect(closingLate("2026-10-01", "confirmed", "2026-10-13")).toBe(true);
    expect(closingLate("2026-10-01", "in_transit", "2026-10-13")).toBe(false);
    expect(closingLate(null, "confirmed", "2026-10-13")).toBe(false);
  });
});
