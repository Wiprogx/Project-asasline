import { describe, expect, it } from "vitest";
import { staffChangeRefusal } from "./people";

const admin = { id: "a", role: "admin" as const, active: true };
const clerk = { id: "c", role: "docs_clerk" as const, active: true };

describe("staff change guards", () => {
  it("refuses switching yourself off", () => {
    expect(staffChangeRefusal("c", clerk, { active: false }, 2)).toMatch(/yourself/);
  });
  it("refuses removing the last active Admin, by switch-off or by role", () => {
    expect(staffChangeRefusal("x", admin, { active: false }, 1)).toMatch(/one active Admin/);
    expect(staffChangeRefusal("x", admin, { role: "accountant" }, 1)).toMatch(/one active Admin/);
  });
  it("allows it when another Admin remains", () => {
    expect(staffChangeRefusal("x", admin, { active: false }, 2)).toBeNull();
    expect(staffChangeRefusal("x", admin, { role: "team_lead" }, 2)).toBeNull();
  });
  it("refuses changing your own role", () => {
    expect(staffChangeRefusal("a", admin, { role: "team_lead" }, 3)).toMatch(/own role/);
  });
  it("allows switching someone else back on, and ordinary changes", () => {
    expect(staffChangeRefusal("a", { ...clerk, active: false }, { active: true }, 1)).toBeNull();
    expect(staffChangeRefusal("a", clerk, { role: "team_lead" }, 1)).toBeNull();
  });
  it("does not count an already switched-off Admin as a loss", () => {
    expect(
      staffChangeRefusal("x", { ...admin, active: false }, { role: "docs_clerk" }, 1),
    ).toBeNull();
  });
});
