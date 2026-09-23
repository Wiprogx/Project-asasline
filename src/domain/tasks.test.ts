import { describe, expect, it } from "vitest";
import {
  bucketOf,
  isMine,
  monthGrid,
  monthStart,
  nextState,
  ownerProblem,
  shiftMonth,
} from "./tasks";

describe("bucketOf", () => {
  const today = "2026-09-23";
  it("sorts a due date into the traffic light", () => {
    expect(bucketOf("2026-09-22", today)).toBe("overdue");
    expect(bucketOf("2026-09-23", today)).toBe("today");
    expect(bucketOf("2026-10-01", today)).toBe("upcoming");
  });
  it("puts a missing or broken date in 'no date', never green", () => {
    expect(bucketOf(null, today)).toBe("undated");
    expect(bucketOf("2026-02-30", today)).toBe("undated");
  });
});

describe("isMine", () => {
  const me = { id: "u1", role: "docs_clerk" as const };
  it("is mine when assigned to me, whatever the role", () => {
    expect(isMine({ assigneeId: "u1", role: "accountant" }, me)).toBe(true);
  });
  it("is not mine when assigned to someone else, even in my role", () => {
    expect(isMine({ assigneeId: "u2", role: "docs_clerk" }, me)).toBe(false);
  });
  it("is mine when addressed to my role and nobody took it", () => {
    expect(isMine({ assigneeId: null, role: "docs_clerk" }, me)).toBe(true);
    expect(isMine({ assigneeId: null, role: "accountant" }, me)).toBe(false);
  });
});

describe("ownerProblem", () => {
  it("refuses a task owned by nobody", () => {
    expect(ownerProblem(null, null)).toMatch(/person or a role/);
    expect(ownerProblem("u1", null)).toBeNull();
    expect(ownerProblem(null, "admin")).toBeNull();
  });
});

describe("months", () => {
  it("parses and shifts months across years", () => {
    expect(monthStart("2026-09")).toBe("2026-09-01");
    expect(monthStart("2026-13")).toBeNull();
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("builds a Monday-first grid padded to full weeks", () => {
    const g = monthGrid("2026-09"); // 1 September 2026 is a Tuesday
    expect(g[0][0]).toEqual({ day: "2026-08-31", inMonth: false });
    expect(g[0][1]).toEqual({ day: "2026-09-01", inMonth: true });
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(30);
    expect(g.at(-1)!.at(-1)!.day).toBe("2026-10-04");
  });
  it("gives no grid for a bad month", () => {
    expect(monthGrid("nope")).toEqual([]);
  });
});

describe("nextState", () => {
  it("allows each move only from its own state", () => {
    expect(nextState("open", "complete")).toBe("done");
    expect(nextState("done", "reopen")).toBe("open");
    expect(nextState("open", "withdraw")).toBe("withdrawn");
    expect(nextState("withdrawn", "putBack")).toBe("open");
  });
  it("refuses completing a withdrawn task or withdrawing a done one", () => {
    expect(nextState("withdrawn", "complete")).toBeNull();
    expect(nextState("done", "withdraw")).toBeNull();
    expect(nextState("open", "reopen")).toBeNull();
  });
});
