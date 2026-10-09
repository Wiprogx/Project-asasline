import { describe, expect, it } from "vitest";
import { bankRuleLines, DEFAULT_BANK_RULES, parseBankRuleLines, ruleFor } from "./bank-rules";

describe("bank rules", () => {
  it("finds the bank's fee by its words in any language, and nothing for a customer's payment", () => {
    expect(ruleFor(DEFAULT_BANK_RULES, "BELFIUS Frais de gestion compte")?.account).toBe("657000");
    expect(ruleFor(DEFAULT_BANK_RULES, "Os Textile payment INV/2026/00012")).toBeNull();
    expect(ruleFor([{ match: "(", account: "657000", label: "broken" }], "anything")).toBeNull();
  });
  it("round-trips through the lines, keeping the | between the words", () => {
    const { rules, problems } = parseBankRuleLines(bankRuleLines(DEFAULT_BANK_RULES));
    expect(problems).toEqual([]);
    expect(rules).toEqual(DEFAULT_BANK_RULES);
    expect(parseBankRuleLines("tva | 999 | VAT").problems[0]).toMatch(/six-digit/);
  });
});
