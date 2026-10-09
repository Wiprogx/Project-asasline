import { describe, expect, it } from "vitest";
import { sentSteps, trackedSteps } from "./closes";
import { DEFAULT_RULES } from "./defaults";

describe("what closes a step without a hand on it", () => {
  it("a message with the rule's template closes a send step; the rule's own code when none is named", () => {
    expect(sentSteps(DEFAULT_RULES, "ASK_INVOICE")).toEqual(["ASK_INV"]);
    expect(sentSteps(DEFAULT_RULES, "SI_OUT")).toEqual(["SI"]);
    expect(sentSteps(DEFAULT_RULES, "SAILED_OUT")).toEqual(["TELL_SAILED"]);
    // INV_CUSTOMS names no template yet: a message coded with the rule's own code closes it.
    expect(sentSteps(DEFAULT_RULES, "INV_CUSTOMS")).toEqual(["INV_CUSTOMS"]);
    expect(sentSteps(DEFAULT_RULES, "QUOTE_OUT")).toEqual([]);
    // A file step never closes on a message, whatever its code.
    expect(sentSteps(DEFAULT_RULES, "INVOICE")).toEqual([]);
    const off = DEFAULT_RULES.map((r) => (r.code === "SI" ? { ...r, active: false } : r));
    expect(sentSteps(off, "SI_OUT")).toEqual([]);
  });

  it("a journey milestone closes the track steps that name it", () => {
    expect(trackedSteps(DEFAULT_RULES, "Vessel departure")).toEqual(["SAILED"]);
    expect(trackedSteps(DEFAULT_RULES, "Arrival at terminal")).toEqual(["TERMINAL"]);
    expect(trackedSteps(DEFAULT_RULES, "Container pickup")).toEqual(["LOADING"]);
    expect(trackedSteps(DEFAULT_RULES, "Customs hold")).toEqual([]);
  });
});
