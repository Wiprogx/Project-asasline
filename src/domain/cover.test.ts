import { describe, expect, it } from "vitest";
import { type Cover, coveredBy, coverOn, coverProblem } from "./cover";

const nadia: Cover = {
  absentId: "nadia",
  coverId: "sam",
  fromDate: "2026-09-10",
  toDate: "2026-09-20",
  ended: false,
};
const names = { absent: "Nadia", cover: "Sam" };

describe("coverOn / coveredBy", () => {
  it("applies from the first to the last day of the absence", () => {
    expect(coverOn([nadia], "nadia", "2026-09-10")).toBe(nadia);
    expect(coverOn([nadia], "nadia", "2026-09-20")).toBe(nadia);
    expect(coverOn([nadia], "nadia", "2026-09-21")).toBeNull();
    expect(coveredBy([nadia], "sam", "2026-09-15")).toEqual(["nadia"]);
  });

  it("runs on without an end date, and stops once ended", () => {
    const open = { ...nadia, toDate: null };
    expect(coverOn([open], "nadia", "2027-01-01")).toBe(open);
    expect(coverOn([{ ...open, ended: true }], "nadia", "2026-09-15")).toBeNull();
  });
});

describe("coverProblem", () => {
  const next = { absentId: "lea", coverId: "sam", from: "2026-09-01", to: "2026-09-05" };

  it("needs somebody else, and an end after the start", () => {
    expect(coverProblem({ ...next, coverId: "lea" }, [], names)).toMatch(/Somebody else/);
    expect(coverProblem({ ...next, to: "2026-08-01" }, [], names)).toMatch(/end is before/);
  });

  it("refuses a colleague who is away on those days too", () => {
    const samAway: Cover = { ...nadia, absentId: "sam", coverId: "x", fromDate: "2026-09-04" };
    expect(coverProblem(next, [samAway], names)).toBe("Sam is away then too.");
    expect(coverProblem({ ...next, to: "2026-09-03" }, [samAway], names)).toBeNull();
  });

  it("refuses two covers for the same person on the same days", () => {
    const leaCovered: Cover = { ...nadia, absentId: "lea", coverId: "x", fromDate: "2026-09-05" };
    expect(coverProblem(next, [leaCovered], { absent: "Lea", cover: "Sam" })).toBe(
      "Lea is already covered for those days.",
    );
  });
});
