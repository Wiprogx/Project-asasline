import { describe, expect, it } from "vitest";
import {
  BILLABLE_KEYS,
  fits,
  newsRecipientId,
  OFFICE_PARTIES,
  PARTY_KEYS,
  partyIds,
  partyOptions,
} from "./booking-parties";

const people = [
  { id: "1", name: "Zeta Lines", professions: ["Carrier"], tags: [] },
  { id: "2", name: "Alpha Textiles", professions: ["Textiles"], tags: [] },
  { id: "3", name: "BeCheck", professions: [], tags: ["doc check"] },
  { id: "4", name: "Atlas Trucking", professions: null, tags: ["Trucking"] },
];
const role = (k: string) => OFFICE_PARTIES.find((p) => p.key === k)!.match;

describe("the parties of a booking", () => {
  it("lists the five trade parties and the six office counterparts, the trade ones billable", () => {
    expect(PARTY_KEYS).toHaveLength(11);
    expect(BILLABLE_KEYS).toEqual(["clientId", "payerId", "shipperId", "consigneeId", "notifyId"]);
  });

  it("recognises a role by industry or by tag, whatever the case", () => {
    expect(fits(people[0], role("shippingCoId"))).toBe(true);
    expect(fits(people[2], role("docCheckId"))).toBe(true);
    expect(fits(people[3], role("transporterId"))).toBe(true);
    expect(fits(people[1], role("customsAgentId"))).toBe(false);
    expect(fits(people[1], undefined)).toBe(false);
  });

  it("offers the contacts that fit first, then everyone else, each by name", () => {
    expect(partyOptions(people, role("shippingCoId")).map((o) => o.label)).toEqual([
      "Zeta Lines",
      "Alpha Textiles",
      "Atlas Trucking",
      "BeCheck",
    ]);
    expect(partyOptions(people, undefined)[0].label).toBe("Alpha Textiles");
  });

  it("collects everyone once, and sends the news to doc check before the customer", () => {
    expect(partyIds({ clientId: "a", payerId: "a", docCheckId: "b", notifyId: null })).toEqual([
      "a",
      "b",
    ]);
    expect(newsRecipientId({ clientId: "a", docCheckId: "b" })).toBe("b");
    expect(newsRecipientId({ clientId: "a", docCheckId: null })).toBe("a");
  });
});
