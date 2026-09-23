import { describe, expect, it } from "vitest";
import { closedDays, pullToWorkday, shiftWorkdays } from "./calendar";
import { DEFAULT_HOLIDAYS, DEFAULT_RULES } from "./defaults";
import {
  applicableRules,
  type BookingFacts,
  countryOfPort,
  type DocRule,
  dueOf,
  fillStep,
  missingPrerequisites,
} from "./engine";
import { planChain, syncDiff } from "./plan";

const booking = (o: Partial<BookingFacts> = {}): BookingFacts => ({
  ref: "SB2609001",
  kind: "export",
  pol: "BEANR",
  pod: "GALBV",
  docType: "SEA WAYBILL",
  anchors: {},
  ...o,
});
const codes = (rs: DocRule[]) => rs.map((r) => r.code).sort();

describe("working days", () => {
  const closed = closedDays(DEFAULT_HOLIDAYS, ["BE", "GA"]);
  it("closes weekends, Belgian holidays and the destination's, not other countries'", () => {
    expect(closed("2026-09-26")).toBe("Saturday");
    expect(closed("2026-12-25")).toBe("Christmas");
    expect(closed("2026-08-17")).toBe("Independence Day — Gabon");
    expect(closed("2026-04-27")).toBeNull(); // King's Day is Dutch
    expect(closed("2026-09-23")).toBeNull();
  });
  it("counts working days over a weekend and a holiday", () => {
    expect(shiftWorkdays("2026-09-28", -2, closed)).toBe("2026-09-24"); // Mon − 2 → Thu
    expect(shiftWorkdays("2026-11-12", -1, closed)).toBe("2026-11-10"); // skips Armistice
    expect(shiftWorkdays("bad", 1, closed)).toBe("");
  });
  it("pulls a deadline off a closed day and says why", () => {
    expect(pullToWorkday("2026-09-27", closed)).toEqual({
      day: "2026-09-25",
      movedBecause: "Sunday",
    });
    expect(pullToWorkday("2026-09-23", closed)).toEqual({ day: "2026-09-23", movedBecause: null });
  });
});

describe("which rules apply", () => {
  it("reads the destination country from the UN/LOCODE", () => {
    expect(countryOfPort("GALBV")).toBe("GA");
    expect(countryOfPort("Libreville")).toBeNull();
    expect(countryOfPort(null)).toBeNull();
  });
  it("adds a country's papers only for that destination", () => {
    expect(codes(applicableRules(DEFAULT_RULES, booking()))).toContain("BIETC_FILE");
    expect(codes(applicableRules(DEFAULT_RULES, booking({ pod: "TRMER" })))).not.toContain(
      "BIETC_FILE",
    );
  });
  it("lets a loading-port rule beat the general one with the same code", () => {
    const exa = (pol: string) =>
      applicableRules(DEFAULT_RULES, booking({ pol })).find((r) => r.code === "EXA")!;
    expect(exa("NLRTM").anchor).toBe("loading");
    expect(exa("BEANR").anchor).toBe("customs");
  });
  it("gives an import the import chain, and a return both chains", () => {
    const imp = codes(applicableRules(DEFAULT_RULES, booking({ kind: "import" })));
    expect(imp).toContain("IMP_DECL");
    expect(imp).not.toContain("EXA");
    const both = codes(applicableRules(DEFAULT_RULES, booking({ kind: "both" })));
    expect(both).toEqual(expect.arrayContaining(["EXA", "IMP_DECL"]));
  });
  it("leaves out switched-off rules", () => {
    expect(codes(applicableRules(DEFAULT_RULES, booking()))).not.toContain("FINAL_BL_CUST");
  });
});

describe("due dates", () => {
  const exa = DEFAULT_RULES.find((r) => r.code === "EXA" && r.pol === "*")!;
  const bietc = DEFAULT_RULES.find((r) => r.code === "BIETC_FILE")!;
  it("has no date until its anchor has one", () => {
    expect(dueOf(exa, booking(), DEFAULT_HOLIDAYS)).toBeNull();
  });
  it("pulls a calendar-day deadline off a weekend", () => {
    const ask = DEFAULT_RULES.find((r) => r.code === "ASK_INV")!; // customs − 2
    expect(dueOf(ask, booking({ anchors: { customs: "2026-09-28" } }), DEFAULT_HOLIDAYS)).toEqual({
      day: "2026-09-25",
      movedBecause: "Saturday",
    });
  });
  it("counts working days, skipping the destination's holiday", () => {
    // ETD Wed 2026-08-19; − 2 working days skips Mon 17 Aug (Gabon's holiday) → Fri 14 Aug
    expect(dueOf(bietc, booking({ anchors: { etd: "2026-08-19" } }), DEFAULT_HOLIDAYS)?.day).toBe(
      "2026-08-14",
    );
  });
  it("names the document the customer chose", () => {
    expect(fillStep("Receive the draft {docName}", { docType: "ORIGINAL BL", ref: "x" })).toBe(
      "Receive the draft Original BL",
    );
  });
});

describe("prerequisites", () => {
  const live = applicableRules(DEFAULT_RULES, booking());
  const si = live.find((r) => r.code === "SI")!;
  it("waits for an unsettled prerequisite and opens once it is settled", () => {
    expect(missingPrerequisites(si, live, DEFAULT_RULES, new Set())).toEqual(["VGM"]);
    expect(missingPrerequisites(si, live, DEFAULT_RULES, new Set(["VGM"]))).toEqual([]);
  });
  it("ignores a prerequisite that exists but not on this route", () => {
    const needsAcid = { ...si, needs: ["ACID"] }; // Egypt's paper, booking goes to Gabon
    expect(missingPrerequisites(needsAcid, live, DEFAULT_RULES, new Set())).toEqual([]);
  });
  it("fails closed on a code that exists nowhere", () => {
    const typo = { ...si, needs: ["VMG"] };
    expect(missingPrerequisites(typo, live, DEFAULT_RULES, new Set(["VGM"]))).toEqual(["VMG"]);
  });
  it("ships a rule book with no dangling prerequisite", () => {
    const known = new Set(DEFAULT_RULES.map((r) => r.code));
    expect(DEFAULT_RULES.flatMap((r) => r.needs).filter((c) => !known.has(c))).toEqual([]);
  });
});

describe("plan and sync", () => {
  const b = booking({ anchors: { customs: "2026-10-05", etd: "2026-10-12", vgm: "2026-10-06" } });
  it("opens what can start, holds what waits, dates what it can", () => {
    const plan = planChain(DEFAULT_RULES, b, DEFAULT_HOLIDAYS, new Set());
    const by = (c: string) => plan.find((p) => p.rule.code === c)!;
    expect(by("ASK_INV")).toMatchObject({ status: "open", due: { day: "2026-10-02" } });
    expect(by("INVOICE")).toMatchObject({ status: "waiting", waitingOn: ["ASK_INV"] });
    expect(by("SI").due).toBeNull(); // no SI closing yet
    expect(by("ASK_INV").title).toBe("Request the export invoice from the customer — SB2609001");
  });
  it("creates open steps once, redates open ones, withdraws what no longer applies", () => {
    const plan = planChain(DEFAULT_RULES, b, DEFAULT_HOLIDAYS, new Set());
    const first = syncDiff(plan, []);
    expect(first.create.map((c) => c.ruleCode)).toContain("ASK_INV");
    expect(first.create.map((c) => c.ruleCode)).not.toContain("INVOICE");

    const tasks = first.create.map((c, i) => ({
      id: `t${i}`,
      ruleCode: c.ruleCode,
      state: "open" as const,
      due: c.due,
    }));
    expect(syncDiff(plan, tasks)).toEqual({ create: [], redate: [], withdraw: [] }); // idempotent

    const moved = planChain(
      DEFAULT_RULES,
      { ...b, anchors: { ...b.anchors, customs: "2026-10-07" } },
      DEFAULT_HOLIDAYS,
      new Set(),
    );
    expect(syncDiff(moved, tasks).redate).toContainEqual({
      id: tasks.find((t) => t.ruleCode === "ASK_INV")!.id,
      due: "2026-10-05",
    });

    // Re-routed from Gabon to Turkey: exactly Gabon's open steps are withdrawn.
    const toTurkey = planChain(DEFAULT_RULES, { ...b, pod: "TRMER" }, DEFAULT_HOLIDAYS, new Set());
    const withdrawn = syncDiff(toTurkey, tasks).withdraw.map((w) => w.id);
    const gabonOnly = tasks.filter((t) => ["BIETC_NO", "BL_FINAL_OUT"].includes(t.ruleCode));
    expect(withdrawn.sort()).toEqual(gabonOnly.map((t) => t.id).sort());
  });
  it("never touches a done or withdrawn step", () => {
    const plan = planChain(DEFAULT_RULES, b, DEFAULT_HOLIDAYS, new Set(["ASK_INV"]));
    const done = [{ id: "d", ruleCode: "ASK_INV", state: "done" as const, due: "1999-01-01" }];
    const diff = syncDiff(plan, done);
    expect(diff.redate).toEqual([]);
    expect(diff.create.map((c) => c.ruleCode)).toContain("INVOICE"); // unblocked by the done step
  });
});
