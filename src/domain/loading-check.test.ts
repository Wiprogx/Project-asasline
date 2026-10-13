import { describe, expect, it } from "vitest";
import { extraTimeItem, hoursBetween, loadingCheck, loadingChecks } from "./loading-check";

const direct = { name: "Direct loading 2h", hours: 2, drop: false, surcharge: null, qty: 0 };
const drop = {
  name: "Drop off container on ground",
  hours: 0,
  drop: true,
  surcharge: null,
  qty: 1,
};
const box = (o: Partial<Record<string, string | null>> = {}) => ({
  loadDate: "2026-10-14",
  loadTime: "08:00",
  loadEndDate: null,
  loadEndTime: null,
  pickBackDate: null,
  pickBackTime: null,
  ...o,
});

describe("hours between two moments", () => {
  it("counts across midnight and is null when a part is missing", () => {
    expect(
      hoursBetween({ date: "2026-10-14", time: "22:30" }, { date: "2026-10-15", time: "01:00" }),
    ).toBe(2.5);
    expect(
      hoursBetween({ date: "2026-10-14", time: null }, { date: "2026-10-14", time: "10:00" }),
    ).toBeNull();
  });
});

describe("the loading check", () => {
  it("waits for the CMR's finish time on a direct loading", () => {
    expect(loadingCheck(direct, box())).toMatchObject({ state: "pending" });
    expect(loadingCheck(null, box())).toBeNull();
    expect(loadingCheck(direct, box({ loadTime: null }))).toBeNull();
  });

  it("charges the hours past the agreed time and the grace, rounded up", () => {
    const ok = loadingCheck(direct, box({ loadEndDate: "2026-10-14", loadEndTime: "10:10" }));
    expect(ok).toMatchObject({ state: "measured", chargeQty: 0 });
    const over = loadingCheck(direct, box({ loadEndDate: "2026-10-14", loadEndTime: "11:20" }));
    expect(over).toMatchObject({ state: "measured", hours: 3.3, over: 1.3, chargeQty: 2 });
    expect(over && "message" in over && over.message).toMatch(/1\.3h over/);
  });

  it("counts a dropped box in days, the first one free", () => {
    expect(loadingCheck(drop, box())).toMatchObject({ state: "pending" });
    const d = loadingCheck(drop, box({ pickBackDate: "2026-10-17", pickBackTime: "09:00" }));
    expect(d).toMatchObject({ state: "measured", drop: true, chargeQty: 3 });
  });

  it("finds the item the extra time is charged with", () => {
    const items = [{ label: "Waiting time per hour" }, { label: "Detention per day" }];
    expect(extraTimeItem(items, false)?.label).toBe("Waiting time per hour");
    expect(extraTimeItem(items, true)?.label).toBe("Detention per day");
    expect(extraTimeItem([], true)).toBeNull();
  });
});

describe("every box of a booking", () => {
  const booking = {
    loadAddress: "Quai 1",
    loadDate: "2026-10-14",
    loadTime: "08:00",
    loadingMode: direct.name,
  };
  const bare = {
    ...box({ loadDate: null, loadTime: null, loadEndDate: "2026-10-14", loadEndTime: "11:20" }),
    loadAddress: null,
    loadingMode: null,
  };

  it("lets the booking stand in for one box, never for two", () => {
    expect(loadingChecks(booking, [bare], [direct])[0]).toMatchObject({ chargeQty: 2 });
    expect(loadingChecks(booking, [bare, bare], [direct])).toEqual([null, null]);
  });
});
