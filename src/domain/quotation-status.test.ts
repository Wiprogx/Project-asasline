import { describe, expect, it } from "vitest";
import { cancelProblem, statusAfterRestore, statusAfterRoutes } from "./quotation-status";

const r = (declined: boolean, booked = false) => ({ declined, booked });

describe("statusAfterRoutes", () => {
  it("turns the quotation lost once every destination is declined", () => {
    expect(statusAfterRoutes("sent", [r(true), r(true)], true)).toBe("declined");
  });

  it("keeps it open while one destination is still offered", () => {
    expect(statusAfterRoutes("sent", [r(true), r(false)], true)).toBe("sent");
  });

  it("opens a lost quotation again when a destination is put back, sent if it went out", () => {
    expect(statusAfterRoutes("declined", [r(true), r(false)], true)).toBe("sent");
    expect(statusAfterRoutes("declined", [r(false)], false)).toBe("draft");
  });

  it("never touches a cancelled or accepted quotation", () => {
    expect(statusAfterRoutes("cancelled", [r(true)], true)).toBe("cancelled");
    expect(statusAfterRoutes("accepted", [r(true)], true)).toBe("accepted");
  });

  it("does not call a quotation without destinations lost", () => {
    expect(statusAfterRoutes("draft", [], false)).toBe("draft");
  });
});

describe("statusAfterRestore", () => {
  it("returns to the status it had before the cancel", () => {
    expect(statusAfterRestore("accepted", false)).toBe("accepted");
  });

  it("falls back to sent or draft when nothing was kept", () => {
    expect(statusAfterRestore(null, true)).toBe("sent");
    expect(statusAfterRestore("cancelled", false)).toBe("draft");
  });
});

describe("cancelProblem", () => {
  it("refuses while a live booking came out of the quotation", () => {
    expect(cancelProblem(["SB2610001"])).toMatch(/^Booking SB2610001 came out .* Cancel it first/);
    expect(cancelProblem(["SB1", "SB2"])).toMatch(/^Bookings SB1, SB2 .* Cancel those first/);
  });

  it("lets it go when nothing was booked", () => {
    expect(cancelProblem([])).toBeNull();
  });
});
