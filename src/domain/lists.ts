/**
 * An edited list as typed in a textarea: one entry per line, trimmed, blanks dropped,
 * duplicates removed (case-insensitive, first spelling kept). Order is the person's order.
 */
export function normaliseList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const v = raw.trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}
