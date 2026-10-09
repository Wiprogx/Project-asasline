/**
 * A seal and where it came from (legacy seals[{no, src}], SEAL_SOURCES): the trucker's, the
 * carrier's, customs', the shipper's… A box keeps its seals as "ABC1234 (Carrier)" strings, so
 * the number stays what it was typed and the source is a word from a Settings list.
 */
export const DEFAULT_SEAL_SOURCES = [
  "Trucker",
  "Carrier",
  "Customs",
  "Shipper",
  "Terminal",
  "Other",
];

export type Seal = { no: string; source: string | null };

/** "ABC1234 (Carrier)" → the number and the source; a bare number has none. */
export function sealOf(text: string): Seal {
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(text.trim());
  return m ? { no: m[1].trim(), source: m[2].trim() } : { no: text.trim(), source: null };
}

export const sealText = (s: Seal) => (s.source ? `${s.no} (${s.source})` : s.no);

/** How a seal reads on paper: "ABC1234 · Carrier". */
export const sealLabel = (s: Seal) => (s.source ? `${s.no} · ${s.source}` : s.no);

/** The first seal whose source is not in the list, or null when every source is known. */
export function sealSourceProblem(
  seals: readonly string[],
  sources: readonly string[],
): string | null {
  const bad = seals.map(sealOf).find((s) => s.source && !sources.includes(s.source));
  return bad
    ? `Seal source "${bad.source}" is not in Settings › Lists › Seal sources (${sources.join(", ")}).`
    : null;
}
