import { describe, expect, it } from "vitest";
import { closeProblem, lockProblem } from "./books";

describe("lockProblem", () => {
  it("refuses a date on the last closed day", () => {
    expect(lockProblem("2026-06-30", "2026-06-30")).toMatch(/closed through 2026-06-30/);
  });

  it("lets through the day after, and anything while nothing is closed", () => {
    expect(lockProblem("2026-07-01", "2026-06-30")).toBeNull();
    expect(lockProblem("2020-01-01", null)).toBeNull();
  });
});

describe("closeProblem", () => {
  it("refuses to close today or later", () => {
    expect(closeProblem("2026-09-23", null, "2026-09-23")).toMatch(/in the past/);
  });

  it("refuses to move the close back", () => {
    expect(closeProblem("2026-03-31", "2026-06-30", "2026-09-23")).toMatch(/never moves back/);
  });

  it("moves the close forward", () => {
    expect(closeProblem("2026-09-22", "2026-06-30", "2026-09-23")).toBeNull();
  });
});
