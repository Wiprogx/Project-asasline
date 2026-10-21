/**
 * The chart of accounts as the office keeps it (legacy editAccount, BASE_CHART): the built-in
 * accounts the books post to, renamed at will, never removed; and the accounts the office adds.
 * A Settings table, not code (invariant 8).
 */
import { CHART } from "./ledger";

export type Chart = Record<string, string>;

/** The office's chart over the built-in one: every built-in account stays, a saved name wins. */
export const withBuiltIn = (saved: Chart | null): Chart => ({ ...CHART, ...(saved ?? {}) });

/** "612000 | Office supplies", one per line, by account. */
export const chartLines = (chart: Chart) =>
  Object.keys(chart)
    .sort()
    .map((code) => `${code} | ${chart[code]}`)
    .join("\n");

/** The chart typed back, account by account; what is wrong, line by line. */
export function parseChartLines(text: string): { chart: Chart; problems: string[] } {
  const chart: Chart = {};
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [code = "", ...rest] = line.split("|").map((x) => x.trim());
      const name = rest.join(" | ");
      if (!/^[1-7]\d{5}$/.test(code))
        problems.push(`Line ${i + 1}: an account of six digits (1 to 7 first).`);
      else if (!name || name.length > 80) problems.push(`Line ${i + 1}: the account's name.`);
      else if (code in chart) problems.push(`Line ${i + 1}: ${code} is there twice.`);
      else chart[code] = name;
    });
  const gone = Object.keys(CHART).filter((c) => !(c in chart));
  if (gone.length)
    problems.push(
      `The books post to ${gone.join(", ")} — rename them if you like, never remove them.`,
    );
  return { chart, problems };
}
