/**
 * The office's own matching rules (legacy BOOKS.rules): a statement line whose text reads like
 * the bank's fee, or the VAT to the state, pays no invoice — it is booked straight to its
 * account. A Settings table: words (| between alternatives), the account, a label.
 */
export type BankRule = { match: string; account: string; label: string };

export const DEFAULT_BANK_RULES: BankRule[] = [
  {
    match: "frais de gestion|beheerskosten|bank charges|frais bancaires|tenue de compte",
    account: "657000",
    label: "Bank charges",
  },
];

const compiles = (p: string) => {
  try {
    new RegExp(p, "i");
    return p.length > 0 && p.length <= 200;
  } catch {
    return false;
  }
};

/** The first rule whose words are in the line's text, or null. */
export function ruleFor(rules: readonly BankRule[], text: string): BankRule | null {
  for (const r of rules) if (compiles(r.match) && new RegExp(r.match, "i").test(text)) return r;
  return null;
}

/* ---- the Settings table, one rule per line: "words|more words | 657000 | Bank charges" ---- */

export const bankRuleLines = (rules: readonly BankRule[]) =>
  rules.map((r) => [r.match, r.account, r.label].join(" | ")).join("\n");

export function parseBankRuleLines(text: string): { rules: BankRule[]; problems: string[] } {
  const rules: BankRule[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const parts = line.split("|").map((x) => x.trim());
      // The words may themselves hold "|" between alternatives: the last two parts are the account and the label.
      const label = parts.length >= 3 ? parts[parts.length - 1] : "";
      const account = parts.length >= 3 ? parts[parts.length - 2] : "";
      const match = parts.slice(0, -2).join("|");
      if (parts.length < 3 || !compiles(match))
        problems.push(`Line ${i + 1}: the words (| between alternatives), the account, a label.`);
      else if (!/^[1-7]\d{5}$/.test(account)) problems.push(`Line ${i + 1}: a six-digit account.`);
      else if (!label || label.length > 60) problems.push(`Line ${i + 1}: a label.`);
      else rules.push({ match, account, label });
    });
  return { rules, problems };
}
