/**
 * The office's figures (legacy kpis): what was invoiced in the period, what customers owe
 * today, how many days it takes to get paid, and the margin by customer, destination and
 * shipping line. Pure arithmetic in integer cents (invariant 3).
 */
export type KpiHead = {
  /** Sales net of credit notes, issued in the period. */
  revenueCents: number;
  /** What customers still owe today, whatever the period. */
  openArCents: number;
  /** Days sales outstanding over the last 90 days: open ÷ gross invoiced in 90 days × 90; null before a sale. */
  dso: number | null;
};

export function kpiHead(p: {
  revenueCents: number;
  openArCents: number;
  grossLast90Cents: number;
}): KpiHead {
  return {
    revenueCents: p.revenueCents,
    openArCents: p.openArCents,
    dso: p.grossLast90Cents > 0 ? Math.round((p.openArCents / p.grossLast90Cents) * 90) : null,
  };
}

export type MarginRow = {
  key: string;
  shipments: number;
  revenueCents: number;
  costCents: number;
  marginCents: number;
  /** Margin over revenue in whole percent; null without revenue. */
  pct: number | null;
};

/** Shipments grouped by a key, best margin first; a shipment with nothing invoiced in the period is left out. */
export function marginBy(
  shipments: readonly { revenueCents: number; costCents: number }[],
  keyOf: (i: number) => string | null | undefined,
): MarginRow[] {
  const m = new Map<string, MarginRow>();
  shipments.forEach((s, i) => {
    if (s.revenueCents === 0) return;
    const key = keyOf(i) || "—";
    const row = m.get(key) ?? {
      key,
      shipments: 0,
      revenueCents: 0,
      costCents: 0,
      marginCents: 0,
      pct: null,
    };
    row.shipments++;
    row.revenueCents += s.revenueCents;
    row.costCents += s.costCents;
    row.marginCents = row.revenueCents - row.costCents;
    row.pct = row.revenueCents ? Math.round((row.marginCents / row.revenueCents) * 100) : null;
    m.set(key, row);
  });
  return [...m.values()].sort((a, b) => b.marginCents - a.marginCents);
}
