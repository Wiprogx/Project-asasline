/**
 * What of an issued invoice may still be credited (legacy creditedQty, creditPart): each line's
 * quantity less what earlier credit notes gave back. A credit note line without a link to the
 * line it credits comes from before lines were linked: it credited the whole invoice.
 */

type Line = { id: string; qty: number };
type Credited = { creditOfLineId: string | null; qty: number };

export function leftToCredit(
  lines: readonly Line[],
  credited: readonly Credited[],
): Record<string, number> {
  const whole = credited.some((c) => c.creditOfLineId === null);
  const back = new Map<string, number>();
  for (const c of credited)
    if (c.creditOfLineId) back.set(c.creditOfLineId, (back.get(c.creditOfLineId) ?? 0) + c.qty);
  return Object.fromEntries(
    lines.map((l) => [l.id, whole ? 0 : Math.max(0, l.qty - (back.get(l.id) ?? 0))]),
  );
}

/** Why the quantities asked cannot be credited, or null: something asked, nothing over what is left. */
export function partProblem(
  asked: Readonly<Record<string, number>>,
  left: Readonly<Record<string, number>>,
  describe: (lineId: string) => string = (id) => id,
): string | null {
  const wanted = Object.entries(asked).filter(([, q]) => q > 0);
  if (!wanted.length) return "Tick at least one line to credit.";
  for (const [id, q] of wanted) {
    if (!(id in left)) return "A line asked for is not on this invoice.";
    if (!Number.isInteger(q)) return `${describe(id)}: a whole quantity.`;
    if (q > left[id]) return `${describe(id)}: only ${left[id]} left to credit.`;
  }
  return null;
}
