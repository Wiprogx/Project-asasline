import { describe, expect, it } from "vitest";
import { bellOf } from "./notify";

describe("bellOf", () => {
  it("is quiet with nothing due, rings for the day, and turns red for what stops a shipment", () => {
    expect(bellOf({ overdue: 0, today: 0, stop: 0 })).toEqual({
      level: "news",
      count: 0,
      label: "Nothing due today",
      href: "/activity",
    });
    expect(bellOf({ overdue: 1, today: 2, stop: 0 })).toEqual({
      level: "today",
      count: 3,
      label: "3 to do: 1 overdue, 2 due today",
      href: "/activity",
    });
    expect(bellOf({ overdue: 1, today: 0, stop: 1 }).level).toBe("stop");
    expect(bellOf({ overdue: 1, today: 0, stop: 1 }).label).toBe(
      "1 to do: 1 stopping a shipment, 1 overdue",
    );
  });

  it("counts the messages waiting in my role's queue too", () => {
    expect(bellOf({ overdue: 1, today: 0, stop: 0, waiting: 2 })).toEqual({
      level: "today",
      count: 3,
      label: "3 to do: 1 overdue, 2 messages waiting",
      href: "/activity",
    });
  });

  it("opens the queue when only messages wait", () => {
    expect(bellOf({ overdue: 0, today: 0, stop: 0, waiting: 1 })).toMatchObject({
      count: 1,
      label: "1 to do: 1 message waiting",
      href: "/discuss/queue",
    });
  });
});
