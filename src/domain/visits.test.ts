import { describe, expect, it } from "vitest";
import { appOf, checkedSeconds, hm, recordOf, timeTable } from "./visits";

const id = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("time at work", () => {
  it("knows the app a path belongs to, home for anything else", () => {
    expect(appOf("/bookings")).toBe("bookings");
    expect(appOf(`/accounting/invoices/${id}`)).toBe("accounting");
    expect(appOf("/settings/people?x=1")).toBe("settings");
    expect(appOf("/")).toBe("home");
    expect(appOf("/login")).toBe("home");
  });

  it("finds the record a path is about", () => {
    expect(recordOf(`/bookings/${id}/documents`)).toEqual({ kind: "booking", id });
    expect(recordOf(`/accounting/invoices/${id.toUpperCase()}`)).toEqual({ kind: "invoice", id });
    expect(recordOf(`/contacts/${id}`)).toEqual({ kind: "contact", id });
    expect(recordOf("/bookings/new")).toBeNull();
    expect(recordOf("/quotations")).toBeNull();
  });

  it("reads seconds as the office does", () => {
    expect(hm(45)).toBe("45s");
    expect(hm(130)).toBe("2m");
    expect(hm(3900)).toBe("1h 05m");
  });

  it("lays people against apps with totals", () => {
    const rows = timeTable(
      [
        { id: "a", name: "Ann" },
        { id: "b", name: "Bob" },
      ],
      [
        { userId: "a", app: "bookings", seconds: 600 },
        { userId: "a", app: "bookings", seconds: 60 },
        { userId: "a", app: "nowhere", seconds: 999 },
        { userId: "b", app: "discuss", seconds: 30 },
      ],
    );
    expect(rows[0].byApp.bookings).toBe(660);
    expect(rows[0].total).toBe(660);
    expect(rows[1].byApp.discuss).toBe(30);
    expect(rows[1].byApp.bookings).toBe(0);
  });

  it("clamps a report to what one can honestly carry", () => {
    expect(checkedSeconds(12.4)).toBe(12);
    expect(checkedSeconds("30")).toBe(30);
    expect(checkedSeconds(99_999)).toBe(600);
    expect(checkedSeconds(0)).toBeNull();
    expect(checkedSeconds("x")).toBeNull();
  });
});
