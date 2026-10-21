/**
 * What an edit changed, field by field, from → to (legacy hist "changed X from A to B"): kept
 * in the audit line so a record's history says what it was before, not only that it changed.
 */
export type Changes = Record<string, [from: string, to: string]>;

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
};

/** The fields of `after` whose shown value differs from `before`'s; the rest are left out. */
export function changesOf(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[] = Object.keys(after),
): Changes {
  const out: Changes = {};
  for (const k of fields) {
    if (!(k in after)) continue;
    const from = show(before[k]);
    const to = show(after[k]);
    if (from !== to) out[k] = [from, to];
  }
  return out;
}

/** "City: Gent → Brussel · Tags: — → B2B", with the field names the screen uses. */
export function describeChanges(changes: Changes, labels: Record<string, string> = {}): string {
  return Object.entries(changes)
    .map(([k, [from, to]]) => `${labels[k] ?? k}: ${from} → ${to}`)
    .join(" · ");
}
