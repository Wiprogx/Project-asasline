import { describe, expect, it } from "vitest";
import {
  activityRuleLines,
  DEFAULT_ACTIVITY_RULES,
  DEFAULT_ACTIVITY_TYPES,
  fillTitle,
  parseActivityRuleLines,
  taskFor,
} from "./activity-rules";

describe("automatic activities", () => {
  it("ship the legacy six rules and the sailing-moved one, five of them active, and seven task types", () => {
    expect(DEFAULT_ACTIVITY_RULES).toHaveLength(7);
    expect(DEFAULT_ACTIVITY_RULES.filter((r) => r.active).map((r) => r.trigger)).toEqual([
      "quote_created",
      "quote_sent",
      "dest_added",
      "booking_created",
      "sailing_moved",
    ]);
    expect(DEFAULT_ACTIVITY_TYPES).toHaveLength(7);
  });

  it("open the task of an active rule with its words, type, role and due day", () => {
    const vars = { ref: "QT2610001", client: "Os Textile", dest: "BEANR › CMDLA" };
    expect(taskFor(DEFAULT_ACTIVITY_RULES, "quote_created", vars, "2026-10-09")).toEqual({
      title: "Send quotation QT2610001 to Os Textile",
      type: "Email",
      role: "docs_clerk",
      due: "2026-10-09",
    });
    expect(taskFor(DEFAULT_ACTIVITY_RULES, "booking_created", vars, "2026-10-09")).toMatchObject({
      title: "Confirm booking QT2610001 with the carrier",
      due: "2026-10-10",
    });
    expect(taskFor(DEFAULT_ACTIVITY_RULES, "dest_added", vars, "2026-10-09")?.title).toBe(
      "Quote BEANR › CMDLA to Os Textile",
    );
  });

  it("open nothing for a rule switched off, and fill a missing word with nothing", () => {
    expect(
      taskFor(DEFAULT_ACTIVITY_RULES, "doc_missing", { ref: "SB1", client: "X" }, "2026-10-09"),
    ).toBeNull();
    expect(fillTitle("Quote {dest} to {client}", { ref: "", client: "X" })).toBe("Quote to X");
  });

  it("round-trip through the Settings lines and refuse a wrong trigger, role or switch", () => {
    const { rules, problems } = parseActivityRuleLines(activityRuleLines(DEFAULT_ACTIVITY_RULES));
    expect(problems).toEqual([]);
    expect(rules).toEqual(DEFAULT_ACTIVITY_RULES);
    expect(parseActivityRuleLines("sunrise | L | T").problems[0]).toMatch(/trigger/);
    expect(parseActivityRuleLines("quote_sent | L | T | Call | janitor").problems[0]).toMatch(
      /role/,
    );
    expect(
      parseActivityRuleLines("quote_sent | L | T | Call | admin | 1 | maybe").problems[0],
    ).toMatch(/on/);
  });
});
