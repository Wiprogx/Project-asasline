/**
 * A seal and where it came from (legacy seals[{no, src}], SEAL_SOURCES): the trucker's, the
 * carrier's, customs', the shipper's… A box keeps its seals as rows (container_seals), each with
 * its number as typed and its source from Settings › Lists › Seal sources; forms and papers read
 * them as "ABC1234 (Carrier)".
 */

export type Seal = { no: string; source: string | null };

/** "ABC1234 (Carrier)" → the number and the source; a bare number has none. */
export function sealOf(text: string): Seal {
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(text.trim());
  return m ? { no: m[1].trim(), source: m[2].trim() } : { no: text.trim(), source: null };
}

export const sealText = (s: Seal) => (s.source ? `${s.no} (${s.source})` : s.no);

/** How a seal reads on paper: "ABC1234 · Carrier". */
export const sealLabel = (s: Seal) => (s.source ? `${s.no} · ${s.source}` : s.no);
