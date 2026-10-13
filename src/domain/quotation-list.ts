import type { QuotationStatus } from "./shipments";

/**
 * The figures above the quotations list (legacy STAT_DEFS, statsPanel): how many, how many
 * still open, won and lost, what they are worth, the win rate — each one chosen or hidden by
 * the office, over a period, against the period before. Integer cents (invariant 3); the rows
 * are whatever the list shows after its filters. A cancelled quotation keeps its number and
 * leaves the figures.
 */
export type QuotationFigures = {
  count: number;
  open: number;
  accepted: number;
  declined: number;
  acceptedValueCents: number;
  openValueCents: number;
  declinedValueCents: number;
  valueCents: number;
  destinations: number;
  /** Accepted over accepted + declined, in whole percent; null before anything was decided. */
  winRate: number | null;
  /** The mean value of a quotation shown; null when none is shown. */
  avgValueCents: number | null;
};

export const OPEN_QUOTATION_STATUSES: readonly QuotationStatus[] = ["draft", "sent"];

type Row = { status: QuotationStatus; valueCents: number; destinations?: number };

export function quotationFigures(rows: readonly Row[]): QuotationFigures {
  const live = rows.filter((r) => r.status !== "cancelled");
  const f = live.reduce(
    (a, r) => ({
      count: a.count + 1,
      open: a.open + (OPEN_QUOTATION_STATUSES.includes(r.status) ? 1 : 0),
      accepted: a.accepted + (r.status === "accepted" ? 1 : 0),
      declined: a.declined + (r.status === "declined" ? 1 : 0),
      acceptedValueCents: a.acceptedValueCents + (r.status === "accepted" ? r.valueCents : 0),
      openValueCents:
        a.openValueCents + (OPEN_QUOTATION_STATUSES.includes(r.status) ? r.valueCents : 0),
      declinedValueCents: a.declinedValueCents + (r.status === "declined" ? r.valueCents : 0),
      valueCents: a.valueCents + r.valueCents,
      destinations: a.destinations + (r.destinations ?? 0),
    }),
    {
      count: 0,
      open: 0,
      accepted: 0,
      declined: 0,
      acceptedValueCents: 0,
      openValueCents: 0,
      declinedValueCents: 0,
      valueCents: 0,
      destinations: 0,
    },
  );
  const decided = f.accepted + f.declined;
  return {
    ...f,
    winRate: decided ? Math.round((f.accepted / decided) * 100) : null,
    avgValueCents: f.count ? Math.round(f.valueCents / f.count) : null,
  };
}

/* ---- which figures to show (legacy STAT_DEFS, DEFAULT_STATS) ---------------------------- */

export type FigureKind = "count" | "cents" | "percent";

export const FIGURE_DEFS = [
  { key: "count", label: "Shown", kind: "count" },
  { key: "open", label: "Open", kind: "count" },
  { key: "accepted", label: "Booked", kind: "count" },
  { key: "declined", label: "Declined", kind: "count" },
  { key: "winRate", label: "Win rate", kind: "percent" },
  { key: "acceptedValueCents", label: "Booked value", kind: "cents" },
  { key: "openValueCents", label: "Value open", kind: "cents" },
  { key: "declinedValueCents", label: "Value declined", kind: "cents" },
  { key: "valueCents", label: "Value shown", kind: "cents" },
  { key: "avgValueCents", label: "Avg quote value", kind: "cents" },
  { key: "destinations", label: "Destinations", kind: "count" },
] as const satisfies readonly { key: keyof QuotationFigures; label: string; kind: FigureKind }[];
export type FigureKey = (typeof FIGURE_DEFS)[number]["key"];

export const DEFAULT_FIGURE_KEYS: readonly FigureKey[] = [
  "count",
  "open",
  "accepted",
  "declined",
  "acceptedValueCents",
  "winRate",
];

/** "?figs=open,winRate" → the keys, in the defs' order; nothing valid → the default set. */
export function parseFigureKeys(param: unknown): FigureKey[] {
  if (typeof param !== "string") return [...DEFAULT_FIGURE_KEYS];
  if (param === "none") return [];
  const asked = new Set(param.split(","));
  const keys = FIGURE_DEFS.map((d) => d.key).filter((k) => asked.has(k));
  return keys.length ? keys : [...DEFAULT_FIGURE_KEYS];
}

/* ---- the rankings (legacy topCustomers) -------------------------------------------------- */

export type Ranked = { label: string; n: number; valueCents: number };

/** The customers by what was booked with them, then by what they asked for (legacy topCustomers). */
export function topCustomers(rows: readonly (Row & { clientName: string })[], n = 5): Ranked[] {
  const m = new Map<string, Ranked>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const e = m.get(r.clientName) ?? { label: r.clientName, n: 0, valueCents: 0 };
    e.n++;
    if (r.status === "accepted") e.valueCents += r.valueCents;
    m.set(r.clientName, e);
  }
  return [...m.values()].sort((a, b) => b.valueCents - a.valueCents || b.n - a.n).slice(0, n);
}
