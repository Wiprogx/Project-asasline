import { RATE_TYPE_LABEL, RATE_TYPES } from "./pricing";

/**
 * Where a catalogue rate comes from (legacy RATE_TYPES, Settings › Rate sources): a contract
 * with the line, a spot quote, a tender… A Settings table (invariant 8); the legacy two are the
 * defaults until saved. The key is what a rate item stores; the label is what the office reads.
 */
export type RateSource = { key: string; label: string };

export const DEFAULT_RATE_SOURCES: readonly RateSource[] = RATE_TYPES.map((key) => ({
  key,
  label: RATE_TYPE_LABEL[key],
}));

/** The label of a key; an unknown key is shown as written. */
export const sourceLabel = (sources: readonly RateSource[], key: string) =>
  sources.find((s) => s.key === key)?.label ?? key;

/** `key | Label` — one source per line, as Settings edits them. */
export const rateSourceLines = (sources: readonly RateSource[]) =>
  sources.map((s) => `${s.key} | ${s.label}`).join("\n");

export function parseRateSourceLines(text: string): { sources: RateSource[]; problems: string[] } {
  const sources: RateSource[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [key = "", label = ""] = line.split("|").map((x) => x.trim());
      if (!/^[a-z][a-z0-9_]{0,20}$/.test(key))
        problems.push(`Line ${i + 1}: a key in lowercase (contract).`);
      else if (!label || label.length > 60)
        problems.push(`Line ${i + 1}: a label (up to 60 characters).`);
      else if (sources.some((s) => s.key === key)) problems.push(`Line ${i + 1}: ${key} twice.`);
      else sources.push({ key, label });
    });
  return { sources, problems };
}
