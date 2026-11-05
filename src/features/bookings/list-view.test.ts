import { describe, expect, it } from "vitest";
import type { BookingRow } from "./list-queries";
import { narrowBookings, sortBookings } from "./list-view";

const row = (o: Partial<BookingRow>): BookingRow =>
  ({
    id: o.ref ?? "x",
    ref: "SB1",
    status: "confirmed",
    kind: "export",
    clientName: "Acme",
    pol: "BEANR",
    pod: "TRMER",
    loads: [],
    modes: [],
    truckers: [],
    boxNos: [],
    boxes: 0,
    valueCents: 0,
    openSteps: 0,
    ...o,
  }) as BookingRow;

describe("narrowing the bookings by a row's menu", () => {
  const rows = [
    row({ ref: "SB1", clientName: "Acme", pod: "TRMER", kind: "export" }),
    row({ ref: "SB2", clientName: "Bolt", pod: "CNSHA", kind: "import", status: "arrived" }),
  ];

  it("keeps the rows like the one chosen", () => {
    expect(narrowBookings(rows, { client: "Acme" }).map((r) => r.ref)).toEqual(["SB1"]);
    expect(narrowBookings(rows, { pod: "CNSHA" }).map((r) => r.ref)).toEqual(["SB2"]);
  });

  it("leaves out the rows like the one filtered out", () => {
    expect(narrowBookings(rows, { xclient: "Acme" }).map((r) => r.ref)).toEqual(["SB2"]);
    expect(narrowBookings(rows, { xstatus: "arrived" }).map((r) => r.ref)).toEqual(["SB1"]);
    expect(narrowBookings(rows, { xkind: "export" }).map((r) => r.ref)).toEqual(["SB2"]);
    expect(narrowBookings(rows, { xpod: "TRMER" }).map((r) => r.ref)).toEqual(["SB2"]);
  });

  it("changes nothing when no filter is asked", () => {
    expect(narrowBookings(rows, {})).toHaveLength(2);
  });
});

describe("ordering the bookings", () => {
  const rows = [
    row({ ref: "SB3", valueCents: 500, etd: null }),
    row({ ref: "SB2", valueCents: 2000, etd: "2026-11-02" }),
    row({ ref: "SB1", valueCents: 1000, etd: "2026-11-01" }),
  ];

  it("sorts on the column asked, both ways", () => {
    expect(sortBookings(rows, { sort: "value" }).map((r) => r.ref)).toEqual(["SB3", "SB1", "SB2"]);
    expect(sortBookings(rows, { sort: "value", dir: "desc" }).map((r) => r.ref)).toEqual([
      "SB2",
      "SB1",
      "SB3",
    ]);
  });

  it("puts an empty value last whichever way", () => {
    expect(sortBookings(rows, { sort: "etd" }).map((r) => r.ref)).toEqual(["SB1", "SB2", "SB3"]);
    expect(sortBookings(rows, { sort: "etd", dir: "desc" }).map((r) => r.ref)).toEqual([
      "SB2",
      "SB1",
      "SB3",
    ]);
  });

  it("keeps the list's own order without a sort or with an unknown one", () => {
    expect(sortBookings(rows, {}).map((r) => r.ref)).toEqual(["SB3", "SB2", "SB1"]);
    expect(sortBookings(rows, { sort: "bogus" }).map((r) => r.ref)).toEqual(["SB3", "SB2", "SB1"]);
  });
});
