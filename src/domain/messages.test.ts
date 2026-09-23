import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROUTES,
  isWaiting,
  keyOf,
  outwardProblem,
  refsInText,
  replySubject,
  routeCodeOf,
  routeRole,
  threadIdOf,
  withKey,
  inQueueOf,
  waitedMinutes,
} from "./messages";

describe("subject key", () => {
  it("stamps the key once and reads it back", () => {
    const s = withKey("Your invoice", "SB2609001", "INVOICE");
    expect(s).toBe("[SB2609001/INVOICE] Your invoice");
    expect(withKey(s, "SB2609001", "INVOICE")).toBe(s);
    expect(keyOf(`Re: ${s}`)).toEqual({ ref: "SB2609001", code: "INVOICE" });
    expect(keyOf("no key here")).toBeNull();
  });
  it("keeps a reply on the same thread", () => {
    expect(replySubject("[SB2609001/MSG] Hello")).toBe("Re: [SB2609001/MSG] Hello");
    expect(replySubject("RE: x")).toBe("RE: x");
    expect(threadIdOf("SB2609001", "INVOICE")).toBe("SB2609001/INVOICE");
    expect(threadIdOf("SB2609001")).toBe("SB2609001/MSG");
    expect(threadIdOf(null)).toBeNull();
  });
});

describe("bare references", () => {
  it("finds every booking or quotation ref once", () => {
    expect(refsInText("sb2609001 vgm 31200 kgs, see also QT2609014 and SB2609001")).toEqual([
      "SB2609001",
      "QT2609014",
    ]);
  });
  it("ignores other numbers", () => {
    expect(refsInText("invoice 2026-0001, tel 0471234567")).toEqual([]);
  });
});

describe("routing", () => {
  it("prefers the topic the sender picked", () => {
    expect(routeCodeOf({ topic: "INVOICE", linkRef: "SB2609001" }, DEFAULT_ROUTES)).toBe("INVOICE");
  });
  it("falls back to the record, then the subject key, then OTHER", () => {
    expect(routeCodeOf({ linkRef: "SB2609001" }, DEFAULT_ROUTES)).toBe("SHIPMENT");
    expect(routeCodeOf({ subject: "Re: [QT2609002/MSG] price" }, DEFAULT_ROUTES)).toBe("QUOTE");
    expect(routeCodeOf({ subject: "[SB2609002/INVOICE] paid?" }, DEFAULT_ROUTES)).toBe("INVOICE");
    expect(routeCodeOf({ subject: "hello" }, DEFAULT_ROUTES)).toBe("OTHER");
  });
  it("sends a route to its role, a switched-off route to the fallback", () => {
    expect(routeRole("INVOICE", DEFAULT_ROUTES)).toBe("accountant");
    const off = DEFAULT_ROUTES.map((r) => (r.code === "INVOICE" ? { ...r, active: false } : r));
    expect(routeRole("INVOICE", off)).toBe("team_lead");
  });
});

describe("waiting", () => {
  const base = {
    direction: "in" as const,
    claimedBy: null,
    channel: "email" as const,
    callOutcome: null,
    answeredLater: false,
  };
  it("waits only while genuinely unanswered", () => {
    expect(isWaiting(base)).toBe(true);
    expect(isWaiting({ ...base, claimedBy: "u1" })).toBe(false);
    expect(isWaiting({ ...base, answeredLater: true })).toBe(false);
    expect(isWaiting({ ...base, direction: "out" })).toBe(false);
    expect(isWaiting({ ...base, direction: "internal" })).toBe(false);
  });
  it("does not queue a call somebody answered, but does queue a missed one", () => {
    expect(isWaiting({ ...base, channel: "call", callOutcome: "answered" })).toBe(false);
    expect(isWaiting({ ...base, channel: "call", callOutcome: "missed" })).toBe(true);
  });
});

describe("outward", () => {
  it("never lets an internal message leave the office", () => {
    expect(outwardProblem("internal")).toMatch(/cannot be sent/);
    expect(outwardProblem("email")).toBeNull();
  });
});

describe("escalation", () => {
  it("counts whole minutes waited", () => {
    const arrived = 1_000_000;
    expect(waitedMinutes(arrived, arrived + 45.5 * 60_000)).toBe(45);
    expect(waitedMinutes(arrived + 60_000, arrived)).toBe(0);
  });

  it("puts a message in its role's queue, and in the Team lead's once it waited too long", () => {
    const m = { routeRole: "accountant" as const, waited: 10 };
    expect(inQueueOf(m, "accountant", 30)).toBe(true);
    expect(inQueueOf(m, "team_lead", 30)).toBe(false);
    expect(inQueueOf({ ...m, waited: 30 }, "team_lead", 30)).toBe(true);
    expect(inQueueOf({ ...m, waited: 90 }, "docs_clerk", 30)).toBe(false);
  });
});
