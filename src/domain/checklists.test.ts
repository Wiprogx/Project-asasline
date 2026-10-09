import { describe, expect, it } from "vitest";
import {
  checklistLines,
  DEFAULT_CHECKLISTS,
  missingItems,
  parseChecklistLines,
} from "./checklists";

describe("checklists", () => {
  it("round-trips the legacy invoice check through its lines", () => {
    const { lists, problems } = parseChecklistLines(checklistLines(DEFAULT_CHECKLISTS));
    expect(problems).toEqual([]);
    expect(lists).toEqual(DEFAULT_CHECKLISTS);
  });
  it("names what was not ticked, and refuses an item twice", () => {
    const [inv] = DEFAULT_CHECKLISTS;
    expect(
      missingItems(inv, ["name", "date", "parties", "goods", "cont", "inco", "freight"]).map(
        (i) => i.t,
      ),
    ).toEqual(["Seal number"]);
    expect(
      parseChecklistLines("invoice | X | seal | A\ninvoice | X | seal | B").problems[0],
    ).toMatch(/twice/);
  });
});
